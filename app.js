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

// async function startDirectPayment(event) {
//   event.preventDefault();

//   const body = {
//     cardNumber: document.getElementById("direct-card").value.replace(/\s/g, ""),

//     expMonth: Number(document.getElementById("direct-exp-month").value),

//     expYear: Number(document.getElementById("direct-exp-year").value),

//     cvc: document.getElementById("direct-cvv").value,

//     amount: Number(document.getElementById("direct-amount").value),
//   };

//   const data = await apiRequest(CONFIG.ENDPOINTS.DIRECT_PAYMENT, "POST", body);

//   savePayment({
//     type: "Direct Card",

//     amount: body.amount,

//     status: data.status,

//     id: data.paymentIntentId,
//   });

//   Swal.fire({
//     icon: "success",
//     title: data.message,
//   });
// }


function initializeDirectPaymentCard() {

    const cardContainer = document.getElementById("card-element");

    if (!cardContainer) {
        console.error("card-element not found");
        return;
    }


    const cardElements = stripe.elements();


    cardElement = cardElements.create("card");


    cardElement.mount("#card-element");


    console.log("Card Element initialized", cardElement);
}

async function startDirectPayment(event) {

    event.preventDefault();

    const amount = Number(
        document.getElementById("direct-amount").value
    );


    const {paymentMethod, error} =
        await stripe.createPaymentMethod({

            type:"card",

            card:cardElement

        });


    if(error){

        Swal.fire({
            icon:"error",
            title:error.message
        });

        return;
    }


    const body = {

        paymentMethodId: paymentMethod.id,

        amount: amount

    };


    const data = await apiRequest(
        CONFIG.ENDPOINTS.DIRECT_PAYMENT,
        "POST",
        body
    );


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
