// ===============================
// PaymentLab Application Logic
// ===============================

let paymentHistory = JSON.parse(localStorage.getItem("payments")) || [];
const stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);

let cardElement;
let elements;

// ===============================
// Hosted Checkout
// ===============================

async function startHostedCheckout(event) {
  event.preventDefault();

  const productName = document.getElementById("hosted-product").value;

  const amount = Number(document.getElementById("hosted-amount").value);

  const data = await apiRequest(CONFIG.ENDPOINTS.HOSTED_CHECKOUT, "POST", {
    productName,
    amount,
  });

  savePayment({
    type: "Hosted Checkout",
    amount,
    status: "Created",
    id: data.sessionId,
  });

  if (data.redirectUrl) {
    window.location.href = data.redirectUrl;
  }
}

// ===============================
// Embedded Checkout
// Stripe Elements
// ===============================

async function startEmbeddedCheckout(event) {
  event.preventDefault();

  const amount = Number(document.getElementById("embedded-amount").value);

  const data = await apiRequest(CONFIG.ENDPOINTS.PAYMENT_INTENT, "POST", {
    amount,
  });

  //stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);

  elements = stripe.elements({
    clientSecret: data.clientSecret,
  });

  const paymentElement = elements.create("payment");

  paymentElement.mount("#payment-element");

  document.getElementById("confirm-payment").classList.remove("hidden");

  window.currentClientSecret = data.clientSecret;
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
      text: result.error.message,
    });
  } else {
    Swal.fire({
      icon: "success",
      title: "Payment Successful",
    });

    savePayment({
      type: "Embedded Checkout",

      status: "Succeeded",

      id: result.paymentIntent.id,
    });
  }
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
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
      fontWeight: "500",
      lineHeight: "24px",

      "::placeholder": {
        color: "#94a3b8",
      },

      iconColor: "#3b82f6",
    },

    invalid: {
      color: "#ef4444",
      iconColor: "#ef4444",
    },

    complete: {
      color: "#22c55e",
      iconColor: "#22c55e",
    },
  };

  cardElement = cardElements.create("card", {
    style: style,
    hidePostalCode: true,
  });

  cardElement.mount("#card-element");

  console.log("Card Element initialized", cardElement);
}

async function startDirectPayment(event) {
  event.preventDefault();

  const amount = Number(document.getElementById("direct-amount").value);

  const { paymentMethod, error } = await stripe.createPaymentMethod({
    type: "card",

    card: cardElement,
  });

  if (error) {
    Swal.fire({
      icon: "error",
      title: error.message,
    });

    return;
  }

  const body = {
    paymentMethodId: paymentMethod.id,

    amount: amount,
  };

  const data = await apiRequest(CONFIG.ENDPOINTS.DIRECT_PAYMENT, "POST", body);

  if (data.status === "succeeded") {
    Swal.fire({
      icon: "success",
      title: "Payment Successful",
    });

    savePayment({
      type: "Direct Payment",
      amount,
      status: data.status,
      id: data.paymentIntentId,
    });
  } else {
    Swal.fire({
      icon: "error",
      title: "Payment Failed",
    });
  }
}

// ===============================
// Webhook Simulator
// ===============================

async function testWebhook() {
  const payload = document.getElementById("webhook-json").value;

  addConsoleLog("POST", "/webhook", 200, payload, {
    message: "Webhook received",
  });

  Swal.fire({
    icon: "success",
    title: "Webhook Verified",
  });
}

// ===============================
// Payment History
// ===============================

function savePayment(payment) {
  payment.date = new Date().toLocaleString();

  paymentHistory.push(payment);

  localStorage.setItem("payments", JSON.stringify(paymentHistory));

  renderHistory();
}

function renderHistory() {
  const table = document.getElementById("payment-history");

  if (!table) return;

  table.innerHTML = "";

  paymentHistory.reverse().forEach((p) => {
    table.innerHTML += `
<tr class="border-b border-slate-700">

<td class="p-3">
${p.type}
</td>


<td class="p-3">
${p.amount ?? "-"}
</td>


<td class="p-3 text-green-400">
${p.status}
</td>


<td class="p-3 text-xs">
${p.id ?? ""}
</td>


<td class="p-3">
${p.date}
</td>


</tr>

`;
  });
}

// ===============================
// Console
// ===============================

function addConsoleLog(method, url, status, request, response) {
  const consoleBox = document.getElementById("api-console");

  if (!consoleBox) return;

  consoleBox.innerHTML += `

<div class="bg-slate-900 p-3 rounded-lg mb-2">

<div>

<span class="text-blue-400">
${method}
</span>

${url}

<span class="text-green-400">
${status}
</span>

</div>


<div class="text-xs mt-2">

Request:

${JSON.stringify(request)}

<br>

Response:

${JSON.stringify(response)}

</div>


</div>

`;

  consoleBox.scrollTop = consoleBox.scrollHeight;
}

function clearConsole() {
  document.getElementById("api-console").innerHTML = "";
}

// ===============================
// Loading
// ===============================

function showLoading(show) {
  const loader = document.getElementById("loader");

  if (loader) {
    loader.classList.toggle("hidden", !show);
  }
}

// ===============================
// Init
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  renderHistory();
  initializeDirectPaymentCard();

  document
    .getElementById("hosted-form")
    ?.addEventListener("submit", startHostedCheckout);

  document
    .getElementById("embedded-form")
    ?.addEventListener("submit", startEmbeddedCheckout);

  document
    .getElementById("direct-form")
    ?.addEventListener("submit", startDirectPayment);

  document
    .getElementById("confirm-payment")
    ?.addEventListener("click", confirmEmbeddedPayment);
});
