//============================
//variables
//============================
let paymentHistory = JSON.parse(localStorage.getItem("paymentsHistory")) || [];
const stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);

let cardElement;
let elements;

const appearance = {
  theme: "night",
  variables: {
    colorPrimary: "#3b82f6",
    colorBackground: "#0f172a",
    colorText: "#f8fafc",
    colorDanger: "#ef4444",
    colorSuccess: "#22c55e",
    colorTextPlaceholder: "#94a3b8",
    borderRadius: "12px",
    fontFamily: "Inter, sans-serif",
    spacingUnit: "4px"
  },
  rules: {
    ".Input": {
      border: "1px solid #334155",
      boxShadow: "none",
      padding: "14px"
    },
    ".Input:focus": {
      border: "1px solid #3b82f6",
      boxShadow: "0 0 0 2px rgba(59,130,246,.25)"
    },
    ".Tab": {
      backgroundColor: "#1e293b",
      border: "1px solid #334155",
      color: "#e2e8f0"
    },
    ".Tab:hover": {
      backgroundColor: "#334155"
    },
    ".Tab--selected": {
      backgroundColor: "#3b82f6",
      color: "#ffffff"
    },
    ".Label": {
      color: "#cbd5e1"
    }
  }
};

//=============================
// switchTab
//=============================

function switchTab(tabId) {
  // Hide all tab contents
  document
    .querySelectorAll(".tab-content")
    .forEach((el) => el.classList.add("hidden"));
  // Remove active classes
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active", "text-blue-400", "font-bold");
    btn.classList.add("text-slate-400");
  });

  // Show selected content
  document.getElementById(`view-${tabId}`).classList.remove("hidden");
  // Activate tab button
  const activeBtn = document.getElementById(`tab-${tabId}`);
  activeBtn.classList.add("active", "font-bold");
  activeBtn.classList.remove("text-slate-400");
}

function savePayment(payment) {
    payment.date ??= new Date().toLocaleString();
    paymentHistory.push(payment);
    localStorage.setItem("paymentsHistory", JSON.stringify(paymentHistory));

    logConsole();
}

function logConsole() {
  paymentHistory = JSON.parse(localStorage.getItem("paymentsHistory")) || [];
  const consoleEl = document.getElementById("api-console");
  consoleEl.innerHTML = "";
  
  paymentHistory.slice().reverse().forEach(p => {
    const logEntry = document.createElement("div");
    logEntry.className =
    "p-2 rounded bg-slate-900 border border-slate-800 space-y-1 animate-fadeIn";
  const statusColor =
    p.status >= 200 && p.status < 300 ? "text-emerald-400" : "text-rose-400";
  
  const statusCode=
      p.status >= 200 && p.status < 300 ? "OK" :"BadRequest";

  logEntry.innerHTML = `
                <div class="flex justify-between items-center text-[11px]">
                    <span class="text-slate-400">[${p.date}] <strong class="text-blue-400">${p.method}</strong> ${p.url}</span>
                    <span class="font-bold ${statusColor}">HTTP ${p.status} ${statusCode}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span class="text-slate-500">Payload:</span> <code class="text-amber-300">${JSON.stringify(p.payload)}</code></div>
                    <div><span class="text-slate-500">Response:</span> <code class="text-purple-300">${JSON.stringify(p.response)}</code></div>
                </div>
            `;

  consoleEl.prepend(logEntry);
  })
}

function clearConsole() {
  paymentHistory = [];
  localStorage.removeItem("paymentsHistory");
  document.getElementById("api-console").innerHTML =
    '<div class="text-slate-500">// History is Removed ....</div>';
}



// ===============================
// Hosted Checkout
// ===============================

async function runHostedCheckout(e) {
  e.preventDefault();
  const productName = document.getElementById("hosted-product").value;
  const amount = parseFloat(document.getElementById("hosted-amount").value);
  let data={productName,amount};

  const ResponseData=await apiRequest(CONFIG.ENDPOINTS.HOSTED_CHECKOUT,"POST",data);
  
   const response =
    ResponseData.status >= 200 && ResponseData.status < 300
        ? {
            sessionId: ResponseData.sessionId,
            redirectUrl: ResponseData.redirectUrl
          }
        : {
            error: ResponseData.error
          };

 savePayment({
        method: "POST",
        url: CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.HOSTED_CHECKOUT,
        status: ResponseData.status,
        payload: data,
        response: response
    });

 if (data.redirectUrl) {
    window.location.href = response.redirectUrl;
  }
}

// ===============================
// Embedded Checkout
// Stripe Elements
// ===============================
let paymentEmbedded;
async function runEmbeddedCheckout(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById("embedded-amount").value);

  const data = { amount: amount };
  const ResponseData = await apiRequest(CONFIG.ENDPOINTS.PAYMENT_INTENT, "POST", data);

  elements=stripe.elements({
     clientSecret: ResponseData.clientSecret,
     appearance
  })

  const paymentElement=elements.create("payment");
  paymentElement.mount("#payment-element");

  document.getElementById("confirm-payment").classList.remove("hidden");

  window.currentClientSecret = ResponseData.clientSecret;
  const response=
       ResponseData.status >= 200 && ResponseData.status < 300
        ? {
            clientSecret: ResponseData.clientSecret,
            PaymentIntentId: ResponseData.PaymentIntentId
          }
        : {
            error: ResponseData.error
          };
  
  paymentEmbedded={
        method: "POST",
        url: CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.PAYMENT_INTENT,
        status: ResponseData.status,
        payload: data,
        response: response
    };

}

async function confirmEmbeddedPayment() {
  const result = await stripe.confirmPayment({
    elements,

    confirmParams: {
      return_url: window.location.origin + "/success.html",
    },

    redirect: "if_required",
  });
 if (result.error) {
  Swal.fire({
    icon: "error",
    title: "Payment Failed",
    html: `<p class="text-sm">${result.error.message}</p>`,
    confirmButtonText: "Try Again",
    confirmButtonColor: "#ef4444",
    background: "#0f172a",
    color: "#fff"
  });
} else {
  Swal.fire({
    icon: "success",
    title: "Payment Successful",
    html: `
      <div class="text-sm text-slate-300">
        Your transaction has been completed successfully.
      </div>
    `,
    background: "#0f172a",
    color: "#fff",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true
  });
 }
  savePayment(paymentEmbedded)
}


// ===============================
// Direct Payment
// ===============================

function initializeDirectPaymentCard() {
  const cardContainer = document.getElementById("card-element");

  if (!cardContainer) {
    console.error("card-element not found");
    return;
  }

  const cardElements = stripe.elements();
  const style = {
        base: {
            color: "#e2e8f0",
            fontFamily: "'Inter', Arial, sans-serif",
            fontSize: "16px",
            fontWeight: "500",
            lineHeight: "24px",

            "::placeholder": {
                color: "#94a3b8"
            },

            iconColor: "#3b82f6",

            ":-webkit-autofill": {
                color: "#e2e8f0"
            }
        },

        invalid: {
            color: "#ef4444",
            iconColor: "#ef4444"
        },

        complete: {
            color: "#22c55e",
            iconColor: "#22c55e"
        }
    };
  cardElement = cardElements.create("card", {
    style,
    hidePostalCode: true,
  });

  cardElement.mount("#card-element");

  console.log("Card Element initialized", cardElement);
}
async function runDirectCheckout(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById("direct-amount").value);
  const data={amount};
  const { paymentMethod, error } = await stripe.createPaymentMethod({
    type: "card",
    card: cardElement,
  });
   
  if (error) {
    Swal.fire({
    icon: "error",
    title: "Payment Failed",
    html: `<p class="text-sm">${error.message}</p>`,
    confirmButtonText: "Try Again",
    confirmButtonColor: "#ef4444",
    background: "#0f172a",
    color: "#fff"
    });

    return;
  }
  const body = {
    paymentMethodId: paymentMethod.id,

    amount: amount,
  };
  const ResponseData = await apiRequest(CONFIG.ENDPOINTS.DIRECT_PAYMENT, "POST", body);
  const response=
       ResponseData.status >= 200 && ResponseData.status < 300
        ? {
            PaymentIntentId: ResponseData.PaymentIntentId
          }
        : {
            error: ResponseData.error
          };
  if (ResponseData.status === 200){
    Swal.fire({
    icon: "success",
    title: "Payment Successful",
    html: `
      <div class="text-sm text-slate-300">
        Your transaction has been completed successfully.
      </div>
    `,
    background: "#0f172a",
    color: "#fff",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true
     });
  }else{
    Swal.fire({
    icon: "error",
    title: "Payment Failed",
    html: `<p class="text-sm">${ResponseData.error}</p>`,
    confirmButtonText: "Try Again",
    confirmButtonColor: "#ef4444",
    background: "#0f172a",
    color: "#fff"
  });

  }
  
savePayment({
        method: "POST",
        url: CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.DIRECT_PAYMENT,
        status: ResponseData.status,
        payload: data,
        response: response
    });
  
}

// Webhook HMAC SHA256 Hash Simulation
async function simulateWebhookCheck() {
  const secret = document.getElementById("wh-secret").value;
  const payload = document.getElementById("wh-payload").value;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hexHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  document.getElementById("wh-computed-hash").innerText =
    `t=${Math.floor(Date.now() / 1000)},v1=${hexHash}`;
  document.getElementById("wh-result").classList.remove("hidden");

 savePayment({
    method: "POST",
    url: "/api/payments/webhook",
    status: 200,
    payload: {
        signature: hexHash
    },
    response: {
        received: true
    }
  });
}

//==========================
//General
//==========================

function copyCode(elementId) {
  const codeText = document.getElementById(elementId).innerText;
  navigator.clipboard.writeText(codeText);
  Swal.fire({
    position: "top-end",
    icon: "success",
    title: "Code copied successfully!",
    background: "#0f172a",
    color: "#fff",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true
  });
}



// ===============================
// Init
// ===============================

document.addEventListener("DOMContentLoaded", () => {
   logConsole()
   initializeDirectPaymentCard();

  document
    .getElementById("hosted-form")
    ?.addEventListener("submit", runHostedCheckout);

  document
    .getElementById("embedded-form")
    ?.addEventListener("submit", runEmbeddedCheckout);

  document
    .getElementById("direct-form")
    ?.addEventListener("submit", runDirectCheckout);

  document
    .getElementById("confirm-payment")
    ?.addEventListener("click", confirmEmbeddedPayment);
});