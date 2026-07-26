const CONFIG = {

    // ASP.NET Core API URL
    API_BASE_URL: "http://localhost:5090/api/Payment",


    // Stripe publishable key
    STRIPE_PUBLIC_KEY:
        "pk_test_51RNw6rC1uYqarA5AG3b5Ykh5jcqnoedLAnT2Sr8oCcbJL57bwtI7Td2IqDJBqRdM06IOwKhaqGFrIGgq8Ve7KIhu00raj2hNTp",


    // API endpoints

    ENDPOINTS: {

        HOSTED_CHECKOUT:
            "/hosted-checkout/create-session",

        PAYMENT_INTENT:
            "/embedded-checkout/create-payment-intent",

        DIRECT_PAYMENT:
            "/direct-checkout/charge-card",

        WEBHOOK:
            "/webhook"

    }

};