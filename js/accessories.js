var fabmo = new FabMoDashboard();

// ===========================================================================
// Rotary indexer catalog
// ===========================================================================
// One entry per indexer size. Everything marked PLACEHOLDER must be filled in
// with real values before "Run Setup" will do anything on a machine.
//
//  config  - object passed straight to fabmo.setConfig(). Shape mirrors the
//            engine config tree, e.g.:
//              { driver: { "4ma": 3, "4sa": 1.8, "4tr": 360, "4mi": 10, "4po": 0 },
//                machine: { ... } }
//            (driver = G2 firmware; motor 4 = the rotary. aam/afr/avm = A axis.)
//            Leave null until the real axis assignment / feedrates / unit
//            values for this size are known.
//
//  macros  - array of macros to install-or-update. Each:
//              { index: <number>, name: <str>, description: <str>,
//                content: <OpenSBP source>, type: "sbp" }
//            Leave [] until the real macro bodies + numbers are decided.
//
//  docUrl    - canonical web docs URL (used when online). null = none yet.
//  localDoc  - bundled offline fallback page, relative to the app root.
// ===========================================================================
var INDEXERS = [
  {
    id: "rotary-3",
    size: '3"',
    name: '3" Rotary Indexer',
    blurb: "Compact 3-inch rotary indexer.",
    image: "images/rotary/3in.png",   // PLACEHOLDER image (pictures incoming)
    docUrl: null,                      // PLACEHOLDER website docs URL
    localDoc: "docs/rotary-indexer.html",
    config: null,                      // PLACEHOLDER real config values
    macros: [],                        // PLACEHOLDER real macros
  },
  {
    id: "rotary-6",
    size: '6"',
    name: '6" Rotary Indexer',
    blurb: "Mid-size 6-inch rotary indexer.",
    image: "images/rotary/6in.png",
    docUrl: null,
    localDoc: "docs/rotary-indexer.html",
    config: null,
    macros: [],
  },
  {
    id: "rotary-12",
    size: '12"',
    name: '12" Rotary Indexer',
    blurb: "Large 12-inch rotary indexer.",
    image: "images/rotary/12in.png",
    docUrl: null,
    localDoc: "docs/rotary-indexer.html",
    config: null,
    macros: [],
  },
];

// A model is "ready" once it has real config to apply. Until then Run Setup is
// inert so a scaffold can never push placeholder values to a live tool.
function isConfigured(model) {
  return !!(model && model.config && Object.keys(model.config).length > 0);
}

// ===========================================================================
// View navigation (context-aware back via each section's data-parent)
// ===========================================================================
var currentView = "view-home";

function showView(id) {
  currentView = id;
  $(".view").removeClass("active");
  $("#" + id).addClass("active");
  var isHome = id === "view-home";
  $("#nav-back").toggle(!isHome);
  $("#nav-home").toggleClass("active", isHome);
  if (id === "view-spindle") refreshSpindleDiscover();
}

function goBack() {
  var parent = $("#" + currentView).data("parent");
  showView(parent || "view-home");
}

// ===========================================================================
// Wiring
// ===========================================================================
var selectedIndexer = null;

$(function () {
  // Home tiles
  $(".tile").on("click", function () {
    showView($(this).data("target"));
  });

  // Nav
  $("#nav-home").on("click", function (e) {
    e.preventDefault();
    showView("view-home");
  });
  $("#nav-back").on("click", function (e) {
    e.preventDefault();
    goBack();
  });

  renderIndexers();

  $("#btn-docs").on("click", openDocumentation);
  $("#btn-setup").on("click", runSetup);

  $("#spindle-setup-configure").on("click", runSpindleConfigure);
  $("#spindle-setup-refresh").on("click", refreshSpindleDiscover);
});

// --- Rotary size picker ---------------------------------------------------
function renderIndexers() {
  var $grid = $("#rotary-model-grid").empty();
  INDEXERS.forEach(function (m) {
    var $card = $(
      '<div class="model-card" data-id="' + m.id + '">' +
        '<div class="model-card-img" style="background-image:url(\'' + m.image + '\')"></div>' +
        '<div class="model-card-name">' + m.size + '</div>' +
      '</div>'
    );
    $card.on("click", function () {
      openIndexer(m.id);
    });
    $grid.append($card);
  });
}

function openIndexer(id) {
  selectedIndexer = INDEXERS.find(function (m) { return m.id === id; });
  if (!selectedIndexer) return;

  $("#detail-name").text(selectedIndexer.name);
  $("#detail-blurb").text(selectedIndexer.blurb || "");
  $("#detail-img").css("background-image", "url('" + selectedIndexer.image + "')");
  $("#detail-status").text("").removeClass("ok err");

  var ready = isConfigured(selectedIndexer);
  $("#detail-unconfigured").toggle(!ready);
  $("#btn-setup").prop("disabled", !ready).toggleClass("disabled", !ready);

  showView("view-rotary-detail");
}

// --- View documentation (online → web, offline → bundled copy) ------------
function openDocumentation() {
  if (!selectedIndexer) return;
  var model = selectedIndexer;

  function openWeb() { window.open(model.docUrl, "_blank"); }
  function openLocal() { window.open(model.localDoc, "_blank"); }

  // No web URL yet → just use the local copy.
  if (!model.docUrl) { openLocal(); return; }

  // Prefer web docs when we have a connection; fall back to the bundled copy.
  fabmo.isOnline(function (err, online) {
    if (!err && online) { openWeb(); } else { openLocal(); }
  });
}

// --- Run Setup: apply config, then install/update macros ------------------
function runSetup() {
  if (!selectedIndexer) return;
  var model = selectedIndexer;

  if (!isConfigured(model)) {
    setStatus("Setup values for this indexer aren’t loaded yet.", "err");
    return;
  }

  var msg = "Apply " + model.name + " setup?\n\n" +
    "This changes machine configuration (axis assignment, feedrates, unit " +
    "values) and installs/updates its macros.";
  if (!window.confirm(msg)) return;

  setStatus("Applying configuration…");
  fabmo.setConfig(model.config, function (err) {
    if (err) {
      setStatus("Config error: " + errText(err), "err");
      return;
    }
    installMacros(model.macros, function (mErr, results) {
      if (mErr) {
        setStatus("Config applied, but macro install failed: " + errText(mErr), "err");
        return;
      }
      var n = (results || []).length;
      setStatus("Setup applied." + (n ? " " + n + " macro(s) installed/updated." : ""), "ok");
    });
  });
}

// Install or update each macro. Existing macros are matched by name so we
// update in place; otherwise we claim the declared index if free, else the
// first free slot — never overwriting an unrelated user macro.
function installMacros(macros, done) {
  if (!macros || !macros.length) { done(null, []); return; }

  fabmo.getMacros(function (err, existing) {
    if (err) { done(err); return; }
    existing = existing || [];

    var used = {};
    existing.forEach(function (m) { used[m.index] = m; });

    var byName = {};
    existing.forEach(function (m) { if (m.name) byName[m.name] = m; });

    var results = [];
    var queue = macros.slice();

    (function next() {
      if (!queue.length) { done(null, results); return; }
      var m = queue.shift();
      var target = chooseIndex(m, byName, used);
      used[target] = { name: m.name };  // reserve within this batch

      fabmo.updateMacro(target, {
        index: target,
        name: m.name,
        description: m.description || "",
        content: m.content || "",
        type: m.type || "sbp",
        enabled: true,
      }, function (uErr) {
        results.push({ name: m.name, index: target, err: uErr });
        next();
      });
    })();
  });
}

function chooseIndex(m, byName, used) {
  if (m.name && byName[m.name]) return byName[m.name].index; // update in place
  if (m.index && !used[m.index]) return m.index;             // claim declared slot
  var i = m.index || 1;                                       // else first free slot
  while (used[i]) i++;
  return i;
}

// --- helpers --------------------------------------------------------------
function setStatus(text, cls) {
  $("#detail-status").text(text).removeClass("ok err").addClass(cls || "");
}

function errText(err) {
  if (!err) return "unknown error";
  return err.message || (typeof err === "string" ? err : JSON.stringify(err));
}

// ===========================================================================
// Spindle / VFD setup (auto-detect + status)
// Moved here from the Configuration app. Talks to the same engine REST routes:
//   GET  /acc/spindle/discover   -> { status, data:{ adapter, installedTemplate } }
//   POST /acc/spindle/configure  -> { status, data:{ ok, steps, template } }
// ===========================================================================
function renderSpindleDiscover(data) {
  data = data || {};
  if (data.adapter) {
    $("#spindle-setup-adapter").val(
      data.adapter.name + "  [" + data.adapter.vid + ":" + data.adapter.pid + "]  " +
      (data.adapter.ttyPath || "(not bound)"));
  } else {
    $("#spindle-setup-adapter").val("Not detected");
  }
  $("#spindle-setup-profile").val(data.installedTemplate || "(none)");
}

function refreshSpindleDiscover() {
  $.ajax({ url: "/acc/spindle/discover", method: "GET", dataType: "json" })
    .done(function (resp) {
      if (resp.status === "success") {
        renderSpindleDiscover(resp.data);
      } else {
        setSpindleStatus("Detection failed: " + (resp.message || "unknown"), "err");
      }
    })
    .fail(function (xhr) {
      setSpindleStatus("Detection request failed: " + xhr.status, "err");
    });
}

function runSpindleConfigure() {
  $("#spindle-setup-configure").prop("disabled", true);
  setSpindleStatus("Detecting & configuring…");
  $.ajax({ url: "/acc/spindle/configure", method: "POST", dataType: "json" })
    .done(function (resp) {
      var d = resp.data || {};
      if (d.ok) {
        setSpindleStatus("Spindle configured: " + d.template, "ok");
        fabmo.notify("success", "Spindle configured: " + d.template);
      } else {
        var reason = spindleFailureReason(d.steps);
        setSpindleStatus("Configuration failed: " + reason, "err");
        fabmo.notify("error", "Spindle configuration failed: " + reason);
      }
      refreshSpindleDiscover();
    })
    .fail(function () {
      setSpindleStatus("Configure request failed", "err");
      fabmo.notify("error", "Spindle configure request failed");
    })
    .always(function () {
      $("#spindle-setup-configure").prop("disabled", false);
    });
}

function spindleFailureReason(steps) {
  var failed = (steps || []).filter(function (s) { return !s.ok; }).pop();
  if (!failed) return "unknown error";
  switch (failed.name) {
    case "detect_adapter":   return "no RS485 adapter detected";
    case "bind_driver":      return "RS485 adapter found but kernel driver did not bind";
    case "probe_vfd":        return "RS485 adapter found, no matching profile for VFD";
    case "install_template": return "profile install failed (" + (failed.detail || "unknown") + ")";
    case "connect_vfd":      return "VFD connect failed (" + (failed.detail || "unknown") + ")";
    default:                 return failed.name + (failed.detail ? " (" + failed.detail + ")" : "");
  }
}

function setSpindleStatus(text, cls) {
  $("#spindle-status").text(text).removeClass("ok err").addClass(cls || "");
}
