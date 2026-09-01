(() => {
  const storedConsent = localStorage.getItem("cookie-consent")
  const analyticsStorage = storedConsent === "accepted" ? "granted" : "denied"

  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments)
  }

  window.gtag("consent", "default", {
    analytics_storage: analyticsStorage,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  })
  window.gtag("js", new Date())
  window.gtag("config", "G-NE4EWMSCGB")

  document.documentElement.dataset.analyticsConsent = analyticsStorage
})()
