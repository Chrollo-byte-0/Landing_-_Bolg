(function () {
  "use strict";

  var script = document.currentScript;
  var siteId = script && script.dataset.siteId;
  var apiUrl = script && script.dataset.apiUrl;
  if (!siteId || !apiUrl || !window.crypto || !window.crypto.randomUUID) {
    console.warn("No se pudo iniciar el seguimiento de métricas: falta configuración segura.");
    return;
  }

  function storedId(storage, key) {
    try {
      var value = storage.getItem(key);
      if (!value) {
        value = crypto.randomUUID();
        storage.setItem(key, value);
      }
      return value;
    } catch (error) {
      console.warn("No se pudo guardar el identificador de métricas.", error);
      return crypto.randomUUID();
    }
  }

  var event = {
    event_id: crypto.randomUUID(),
    type: "page_view",
    session_id: storedId(sessionStorage, "metrics-session-" + siteId),
    visitor_id: storedId(localStorage, "metrics-visitor-" + siteId),
    site_id: siteId,
    path: window.location.pathname
  };
  var referrerHost = document.referrer ? new URL(document.referrer).hostname : "";
  if (/^[A-Za-z0-9.:-]{1,120}$/.test(referrerHost)) event.referrer_host = referrerHost;

  fetch(apiUrl.replace(/\/$/, "") + "/api/v1/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: [event] }),
    keepalive: true
  }).then(function (response) {
    if (!response.ok) throw new Error("HTTP " + response.status);
  }).catch(function (error) {
    console.warn("No se pudo enviar la visita al servicio de métricas.", error);
  });
})();
