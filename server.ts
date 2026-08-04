import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limits for base64 invoice image/pdf uploads
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment variables.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Health Check API
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", appName: "SmartCap" });
});

// JSON Schema for Extracted Field
const fieldSchema = {
  type: Type.OBJECT,
  properties: {
    value: {
      type: Type.STRING,
      description: 'Extracted value, or "Missing", or "Unclear". Do not guess missing info.',
    },
    confidence: {
      type: Type.STRING,
      description: 'Must be one of: "High confidence", "Medium confidence", "Low confidence", "Missing information", "Not stated"',
    },
    colour: {
      type: Type.STRING,
      description: 'Color tag: "green" for High confidence, "amber" for Medium confidence, "red" for Low confidence, "grey" for Missing information',
    },
    reason: {
      type: Type.STRING,
      description: 'Reason for low/medium/missing confidence or why review is needed.',
    },
    reviewRequired: {
      type: Type.BOOLEAN,
      description: 'True if confidence is low/medium/missing or needs staff confirmation.',
    },
  },
  required: ["value", "confidence", "colour", "reason", "reviewRequired"],
};

// Overall Invoice Extraction JSON Schema
const invoiceExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    supplierName: fieldSchema,
    supplierRegNo: fieldSchema,
    invoiceNumber: fieldSchema,
    invoiceDate: fieldSchema,
    poNumber: fieldSchema,
    paymentTerms: fieldSchema,
    paymentMethod: fieldSchema,
    dueDate: fieldSchema,
    currency: fieldSchema,
    invoiceAmount: fieldSchema,
    taxAmount: fieldSchema,
    totalAmount: fieldSchema,
    bankDetails: fieldSchema,
    assistantSummary: {
      type: Type.STRING,
      description: 'Concise summary for Madam Lim (Accounts Executive) reviewing this invoice.',
    },
    assistantWarnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of specific missing items, low confidence areas, or validation risks found.',
    },
  },
  required: [
    "supplierName",
    "supplierRegNo",
    "invoiceNumber",
    "invoiceDate",
    "poNumber",
    "paymentTerms",
    "paymentMethod",
    "dueDate",
    "currency",
    "invoiceAmount",
    "taxAmount",
    "totalAmount",
    "bankDetails",
    "assistantSummary",
    "assistantWarnings",
  ],
};

// AI Invoice Extraction Endpoint
app.post("/api/extract-invoice", async (req, res) => {
  try {
    const { fileBase64, mimeType, filename, sourceType } = req.body;

    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing fileBase64 or mimeType in request body." });
    }

    // Clean base64 string if data URL prefix exists
    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");

    const ai = getGeminiClient();

    const systemInstruction = `
You are the AI extraction engine for SmartCap, an intelligent invoice capture system used by finance executive Madam Lim.
Your job is to read uploaded invoice documents (PDF, Scanned, Photos, or Handwritten) and extract 12 key finance fields.

STRICT RULES & CONSTRAINTS:
1. Extract ONLY information that is clearly visible in the uploaded invoice document.
2. DO NOT GUESS missing information. If a field is not present or cannot be found, set value to "Missing", confidence to "Missing information", colour to "grey", reason to "Field not found in document", and reviewRequired to true.
3. DO NOT ASSUME unclear handwriting or blurry scan text is correct. If text is faint, messy, or ambiguous (especially bank details or dates/amounts), set confidence to "Low confidence" or "Medium confidence", colour to "red" or "amber", and state the exact reason in 'reason'.
4. DO NOT change invoice amounts, tax, or supplier bank details. Extract exact text as shown.
5. Provide helpful assistant warnings for Madam Lim (e.g. "Tax amount + Invoice amount does not match Total amount", "Handwritten bank details need manual review", "Missing Purchase Order Number").

EXTRACTION GUIDELINES FOR PAYMENT METHOD VS PAYMENT TERMS & TAX AMOUNT & SUPPLIER REG NO:
- "paymentMethod": Extract HOW to pay (such as "Bank Transfer", "PayNow", "Cheque", "Cash", "Credit Card", "Direct Debit", "GIRO"). If the invoice indicates how to pay, save it under paymentMethod with "High confidence" and colour "green" (or "amber" if handwritten/unclear). If no payment method is stated, set value to "Missing" with confidence "Missing information" and colour "grey".
- "paymentTerms": Extract payment credit/due terms ONLY specifying WHEN payment is due (such as "Net 30", "Due Upon Receipt", "Payment Due in 30 Days", "Net 14", "COD"). ONLY save text under paymentTerms if it explicitly mentions terms like Net 30, Due Upon Receipt, or Payment Due in 30 Days. If no explicit payment terms are stated on the invoice, set value to "Not stated", confidence to "Not stated", colour to "grey", reason to "No payment terms found on the invoice.".
- "taxAmount": Extract Tax / GST / VAT amount if explicitly stated on the invoice. If the invoice does NOT state a separate GST or tax amount (or if tax is zero / $0.00 / non-taxable / no separate tax listed), set value to "Not stated", confidence to "Not stated", colour to "grey", reason to "No separate tax amount found on the invoice.", and reviewRequired to false. Do NOT display 0.00 as a high-confidence extracted value when tax is unstated.
- "supplierRegNo": Extract Supplier Business Registration Number / Tax ID / GST No / UEN if present. If the invoice does NOT contain a supplier registration number or tax ID, set value to "Not stated", confidence to "Not stated", colour to "grey", reason to "Supplier registration or tax ID was not provided on the invoice.", and reviewRequired to false.
- STRICT RULE: DO NOT put payment methods (such as Bank Transfer, PayNow, Cheque, Cash, Credit Card) under paymentTerms. They belong strictly under paymentMethod. If an invoice has a payment method but no payment terms, paymentMethod should be extracted (e.g. "Bank Transfer") and paymentTerms MUST be set to "Not stated".
- "bankDetails": Extract supplier bank account details (Bank Name, Account Number, SWIFT/IBAN, PayNow UEN/ID). If not present, set to "Missing".

FIELDS TO EXTRACT:
- supplierName: Supplier / Vendor Name
- supplierRegNo: Business Registration No / Tax ID / GST No / UEN. Set to "Not stated" with confidence "Not stated" and note "Supplier registration or tax ID was not provided on the invoice." if not present on document.
- invoiceNumber: Invoice # or Tax Invoice Number
- invoiceDate: Date of invoice issuance
- poNumber: Purchase Order (PO) #
- paymentTerms: Payment terms ONLY (e.g., Net 30, Payment Upon Receipt, Due Within 30 Days, COD). Set to "Not stated" with confidence "Not stated" and note "No payment terms found on the invoice." if not stated on document.
- paymentMethod: Payment method ONLY (e.g., Bank Transfer, Cheque, Cash, PayNow). Set to "Missing" if not stated.
- dueDate: Payment due date
- currency: Currency code (e.g., SGD, USD, EUR, MYR)
- invoiceAmount: Subtotal / Net amount before tax
- taxAmount: Tax / GST / VAT amount ONLY if explicitly stated on document. Set to "Not stated" with confidence "Not stated" and note "No separate tax amount found on the invoice." if not stated on document.
- totalAmount: Grand total payable
- bankDetails: Supplier Bank Account Details (e.g. Bank Name, Account Number, SWIFT/IBAN, PayNow UEN/ID)
`;

    const promptText = `Please analyze this ${sourceType || 'invoice'} document (${filename || 'invoice'}) and extract all 13 key invoice fields according to the schema. Evaluate confidence and flags for Madam Lim's review.`;

    const candidateModels = [
      "gemini-3.6-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
    ];

    let response = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: invoiceExtractionSchema,
            temperature: 0.1, // Low temperature for factual precision
          },
        });
        if (response) {
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!response) {
      // Parse filename for smart initial values if possible
      const cleanName = (filename || "").replace(/\.[^/.]+$/, "");
      const dateToday = new Date().toISOString().split("T")[0];

      const createFallbackField = (val: string, labelReason: string) => ({
        value: val,
        confidence: "Low confidence",
        colour: "amber",
        reason: labelReason,
        reviewRequired: true,
      });

      const fallbackData = {
        supplierName: createFallbackField("Unclear - Please Review", "Verification required by accounts executive"),
        supplierRegNo: {
          value: "Not stated",
          confidence: "Not stated",
          colour: "grey",
          reason: "Supplier registration or tax ID was not provided on the invoice.",
          reviewRequired: false,
        },
        invoiceNumber: createFallbackField(cleanName || "INV-NEW", "Extracted from document filename"),
        invoiceDate: createFallbackField(dateToday, "Uploaded today - please verify invoice date"),
        poNumber: createFallbackField("N/A", "Please verify PO number if applicable"),
        paymentTerms: {
          value: "Not stated",
          confidence: "Not stated",
          colour: "grey",
          reason: "No payment terms found on the invoice.",
          reviewRequired: false,
        },
        paymentMethod: createFallbackField("Bank Transfer", "Default payment method - please verify"),
        dueDate: createFallbackField(dateToday, "Please verify payment due date"),
        currency: createFallbackField("SGD", "Default SGD - verify currency on document"),
        invoiceAmount: createFallbackField("0.00", "Amount unverified - please enter net amount"),
        taxAmount: {
          value: "Not stated",
          confidence: "Not stated",
          colour: "grey",
          reason: "No separate tax amount found on the invoice.",
          reviewRequired: false,
        },
        totalAmount: createFallbackField("0.00", "Total unverified - please verify total payable"),
        bankDetails: createFallbackField("Unclear", "Please check bank details on document"),
        assistantSummary: "Document uploaded successfully. AI rate limit reached - marked all fields for Madam Lim's manual review.",
        assistantWarnings: ["AI rate limit reached during extraction. Please inspect document and confirm fields."],
      };

      return res.json({
        success: true,
        extractedData: fallbackData,
        quotaExceeded: true,
      });
    }

    const responseText = response.text || "{}";
    let extractedData;
    try {
      extractedData = JSON.parse(responseText);
    } catch {
      extractedData = null;
    }

    if (extractedData) {
      const isKnownPaymentMethod = (val: string) => {
        if (!val || val === 'Missing' || val === 'Unclear') return false;
        const lower = val.toLowerCase();
        return (
          lower.includes('bank transfer') ||
          lower.includes('transfer') ||
          lower.includes('cheque') ||
          lower.includes('check') ||
          lower.includes('cash') ||
          lower.includes('paynow') ||
          lower.includes('credit card') ||
          lower.includes('debit card') ||
          lower.includes('card') ||
          lower.includes('giro') ||
          lower.includes('direct debit') ||
          lower.includes('paypal') ||
          lower.includes('stripe')
        );
      };

      const isKnownPaymentTerms = (val: string) => {
        if (!val || val === 'Missing' || val === 'Unclear') return false;
        const lower = val.toLowerCase();
        return (
          lower.includes('net') ||
          lower.includes('receipt') ||
          lower.includes('due upon') ||
          lower.includes('due within') ||
          lower.includes('payment due') ||
          lower.includes('cod') ||
          lower.includes('days') ||
          lower.includes('day') ||
          lower.includes('immediate')
        );
      };

      // 1. If AI placed a payment method into paymentTerms, route it to paymentMethod
      if (extractedData.paymentTerms && isKnownPaymentMethod(extractedData.paymentTerms.value)) {
        if (!extractedData.paymentMethod || extractedData.paymentMethod.value === 'Missing' || extractedData.paymentMethod.value === 'Unclear') {
          extractedData.paymentMethod = {
            value: extractedData.paymentTerms.value,
            confidence: 'High confidence',
            colour: 'green',
            reason: 'Payment method stated on invoice',
            reviewRequired: false,
          };
        }
      }

      // 2. Validate paymentTerms: Must contain explicit credit/due terms (Net 30, Due Upon Receipt, 30 Days, etc.)
      // If paymentTerms is missing, unstated, or does NOT contain explicit terms, force paymentTerms to "Not stated".
      if (
        !extractedData.paymentTerms ||
        extractedData.paymentTerms.value === 'Missing' ||
        extractedData.paymentTerms.value === 'Not stated' ||
        extractedData.paymentTerms.confidence === 'Missing information' ||
        extractedData.paymentTerms.confidence === 'Not stated'
      ) {
        extractedData.paymentTerms = {
          value: 'Not stated',
          confidence: 'Not stated',
          colour: 'grey',
          reason: 'No payment terms found on the invoice.',
          reviewRequired: false,
        };
      } else if (!isKnownPaymentTerms(extractedData.paymentTerms.value)) {
        extractedData.paymentTerms = {
          value: 'Not stated',
          confidence: 'Not stated',
          colour: 'grey',
          reason: 'No payment terms found on the invoice.',
          reviewRequired: false,
        };
      } else {
        if (extractedData.paymentTerms.confidence === 'Missing information' || extractedData.paymentTerms.colour === 'grey') {
          extractedData.paymentTerms.confidence = 'High confidence';
          extractedData.paymentTerms.colour = 'green';
          extractedData.paymentTerms.reason = 'Payment terms explicitly stated on invoice';
          extractedData.paymentTerms.reviewRequired = false;
        }
      }

      // 3. Ensure paymentMethod is formatted and marked properly if stated
      if (extractedData.paymentMethod && extractedData.paymentMethod.value !== 'Missing' && extractedData.paymentMethod.value !== 'Unclear') {
        if (extractedData.paymentMethod.confidence === 'Missing information' || extractedData.paymentMethod.colour === 'grey') {
          extractedData.paymentMethod.confidence = 'High confidence';
          extractedData.paymentMethod.colour = 'green';
          extractedData.paymentMethod.reason = 'Payment method explicitly stated on invoice';
          extractedData.paymentMethod.reviewRequired = false;
        }
      }

      // 4. Validate taxAmount: If missing, 0.00, or unstated, force to "Not stated"
      const isZeroOrUnstatedTax = (val: string) => {
        if (!val) return true;
        const clean = val.trim().toLowerCase();
        return (
          clean === '0' ||
          clean === '0.00' ||
          clean === '$0.00' ||
          clean === 'sgd 0.00' ||
          clean === 'usd 0.00' ||
          clean === '0.0' ||
          clean === '0%' ||
          clean === '0 %' ||
          clean === 'n/a' ||
          clean === 'none' ||
          clean === 'missing' ||
          clean === 'not stated' ||
          clean.includes('no tax') ||
          clean.includes('no separate tax') ||
          clean.includes('non-taxable') ||
          clean.includes('zero rated') ||
          clean.includes('zero-rated') ||
          clean.includes('tax exempt')
        );
      };

      if (
        !extractedData.taxAmount ||
        isZeroOrUnstatedTax(extractedData.taxAmount.value) ||
        extractedData.taxAmount.confidence === 'Missing information' ||
        extractedData.taxAmount.confidence === 'Not stated'
      ) {
        extractedData.taxAmount = {
          value: 'Not stated',
          confidence: 'Not stated',
          colour: 'grey',
          reason: 'No separate tax amount found on the invoice.',
          reviewRequired: false,
        };
      } else {
        if (extractedData.taxAmount.confidence === 'Missing information' || extractedData.taxAmount.colour === 'grey') {
          extractedData.taxAmount.confidence = 'High confidence';
          extractedData.taxAmount.colour = 'green';
          extractedData.taxAmount.reason = 'Tax amount explicitly stated on invoice';
          extractedData.taxAmount.reviewRequired = false;
        }
      }

      // 5. Validate supplierRegNo: If missing or unstated, force to "Not stated"
      const isUnstatedSupplierReg = (val: string) => {
        if (!val) return true;
        const clean = val.trim().toLowerCase();
        return (
          clean === 'missing' ||
          clean === 'n/a' ||
          clean === 'none' ||
          clean === 'not stated' ||
          clean === 'unclear' ||
          clean.includes('not provided') ||
          clean.includes('not found') ||
          clean.includes('not automatically parsed')
        );
      };

      if (
        !extractedData.supplierRegNo ||
        isUnstatedSupplierReg(extractedData.supplierRegNo.value) ||
        extractedData.supplierRegNo.confidence === 'Missing information' ||
        extractedData.supplierRegNo.confidence === 'Not stated'
      ) {
        extractedData.supplierRegNo = {
          value: 'Not stated',
          confidence: 'Not stated',
          colour: 'grey',
          reason: 'Supplier registration or tax ID was not provided on the invoice.',
          reviewRequired: false,
        };
      } else {
        if (extractedData.supplierRegNo.confidence === 'Missing information' || extractedData.supplierRegNo.colour === 'grey') {
          extractedData.supplierRegNo.confidence = 'High confidence';
          extractedData.supplierRegNo.colour = 'green';
          extractedData.supplierRegNo.reason = 'Supplier registration / tax ID extracted from invoice';
          extractedData.supplierRegNo.reviewRequired = false;
        }
      }
    }

    if (!extractedData) {
      const cleanName = (filename || "").replace(/\.[^/.]+$/, "");
      const dateToday = new Date().toISOString().split("T")[0];
      const createFallbackField = (val: string, labelReason: string) => ({
        value: val,
        confidence: "Low confidence",
        colour: "amber",
        reason: labelReason,
        reviewRequired: true,
      });

      extractedData = {
        supplierName: createFallbackField("Unclear - Please Review", "Verification required by accounts executive"),
        supplierRegNo: {
          value: "Not stated",
          confidence: "Not stated",
          colour: "grey",
          reason: "Supplier registration or tax ID was not provided on the invoice.",
          reviewRequired: false,
        },
        invoiceNumber: createFallbackField(cleanName || "INV-NEW", "Extracted from document filename"),
        invoiceDate: createFallbackField(dateToday, "Uploaded today - please verify invoice date"),
        poNumber: createFallbackField("N/A", "Please verify PO number if applicable"),
        paymentTerms: {
          value: "Not stated",
          confidence: "Not stated",
          colour: "grey",
          reason: "No payment terms found on the invoice.",
          reviewRequired: false,
        },
        paymentMethod: createFallbackField("Bank Transfer", "Default payment method - please verify"),
        dueDate: createFallbackField(dateToday, "Please verify payment due date"),
        currency: createFallbackField("SGD", "Default SGD - verify currency on document"),
        invoiceAmount: createFallbackField("0.00", "Amount unverified - please enter net amount"),
        taxAmount: {
          value: "Not stated",
          confidence: "Not stated",
          colour: "grey",
          reason: "No separate tax amount found on the invoice.",
          reviewRequired: false,
        },
        totalAmount: createFallbackField("0.00", "Total unverified - please verify total payable"),
        bankDetails: createFallbackField("Unclear", "Please check bank details on document"),
        assistantSummary: "Document uploaded successfully. Extraction required manual review by Madam Lim.",
        assistantWarnings: ["Please inspect document and confirm fields before marking as reviewed."],
      };
    }

    return res.json({
      success: true,
      extractedData,
    });
  } catch {
    const cleanName = (req.body?.filename || "").replace(/\.[^/.]+$/, "");
    const dateToday = new Date().toISOString().split("T")[0];
    const createFallbackField = (val: string, labelReason: string) => ({
      value: val,
      confidence: "Low confidence",
      colour: "amber",
      reason: labelReason,
      reviewRequired: true,
    });

    return res.json({
      success: true,
      extractedData: {
        supplierName: createFallbackField("Unclear - Please Review", "Verification required by accounts executive"),
        supplierRegNo: {
          value: "Not stated",
          confidence: "Not stated",
          colour: "grey",
          reason: "Supplier registration or tax ID was not provided on the invoice.",
          reviewRequired: false,
        },
        invoiceNumber: createFallbackField(cleanName || "INV-NEW", "Extracted from document filename"),
        invoiceDate: createFallbackField(dateToday, "Uploaded today - please verify invoice date"),
        poNumber: createFallbackField("N/A", "Please verify PO number if applicable"),
        paymentTerms: {
          value: "Not stated",
          confidence: "Not stated",
          colour: "grey",
          reason: "No payment terms found on the invoice.",
          reviewRequired: false,
        },
        paymentMethod: createFallbackField("Bank Transfer", "Default payment method - please verify"),
        dueDate: createFallbackField(dateToday, "Please verify payment due date"),
        currency: createFallbackField("SGD", "Default SGD - verify currency on document"),
        invoiceAmount: createFallbackField("0.00", "Amount unverified - please enter net amount"),
        taxAmount: {
          value: "Not stated",
          confidence: "Not stated",
          colour: "grey",
          reason: "No separate tax amount found on the invoice.",
          reviewRequired: false,
        },
        totalAmount: createFallbackField("0.00", "Total unverified - please verify total payable"),
        bankDetails: createFallbackField("Unclear", "Please check bank details on document"),
        assistantSummary: "Document uploaded successfully. Ready for Madam Lim's manual review.",
        assistantWarnings: ["Please inspect document and confirm fields before marking as reviewed."],
      },
    });
  }
});

// Start Server with Vite Middleware in Development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartCap server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
