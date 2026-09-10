const modal = document.getElementById("settings_modal");
//small fixes
document.getElementById("settings_btn").onclick = () => {
    modal.classList.add("show");
};

document.getElementById("close_settings").onclick = () => {
    modal.classList.remove("show");
};

// Close when clicking outside the dialog
modal.onclick = (e) => {
    if (e.target === modal) {
        modal.classList.remove("show");
    }
};

// Optional: Close with Escape
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        modal.classList.remove("show");
    }
});

let scratch_bar_display = 'wY'
const scratch_bar_display_div = document.getElementById("scratch_bar_display_mode");

scratch_bar_display_div.addEventListener("change", () => {
    scratch_bar_display = scratch_bar_display_div.value
});


let compress_BMS = document.getElementById("compress_bms")
let format_cOCF = document.getElementById("format_cOCF")

function makeResizable(panelElement, panelState) {
    const handle = panelElement.querySelector(".resize-handle");
    let startY;
    let startHeight;
    let currentHeight;
    let ticking = false;

    handle.addEventListener("pointerdown", e => {
        e.preventDefault();
        startY = e.clientY;
        startHeight = panelElement.offsetHeight;

        function move(ev) {
            currentHeight = Math.max(30, startHeight + ev.clientY - startY);

            // Throttle style updates with window.requestAnimationFrame
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    panelElement.style.height = currentHeight + "px";
                    panelState.height = currentHeight + "px"; // Store immediately inside the state object
                    ticking = false;
                });
                ticking = true;
            }
        }

        function up() {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        }

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    });
}

document.querySelectorAll(".resizable").forEach(makeResizable);

const Scratch_bar_height = document.getElementById("Scratch_bar_height");

Scratch_bar_height.addEventListener("input", function () {
    document.documentElement.style.setProperty(
        "--scratch-bar-height",
        Scratch_bar_height.valueAsNumber + "px"
    );
});

let page = 0; // 0: main, 1: progress, 2: milestone (and 3: some cool mountain)
//did u even do that
//just compress it into a SINGLE FUNCTION thats so good :3
const btn_lngi = document.getElementById("btn_lngi");

btn_lngi.addEventListener("click", () => {
    page = 0;
    update_page()
});

const btn_progress = document.getElementById("btn_progress");

btn_progress.addEventListener("click", () => {
    page = 1;
    update_page()
});

const btn_search = document.getElementById("btn_search");

btn_search.addEventListener("click", () => {
    page = 0;
    update_page()
});

const btn_mountain = document.getElementById("mountain_btn");

btn_mountain.addEventListener("click", () => {
    page = 3;
    update_page()
});

const btn_milestone = document.getElementById("btn_milestone");

btn_milestone.addEventListener("click", () => {
    page = 4;
    update_page()
});

const btn_buddy = document.getElementById("btn_buddy");

btn_buddy.addEventListener("click", () => {
    page = 5;
    update_page()
});

function update_page() {
    document.getElementById("analysis_container").style.display = page == 0 ? "flex" : "none"
    document.getElementById("analysis_toolbar").style.display = page == 0 ? "flex" : "none"
    document.getElementById("milestone_header").style.display = page == 1 ? "flex" : "none"
    document.getElementById("scratch_bars").hidden = (page != 1)
    document.getElementById("future-milestone").hidden = (page != 2)
    document.getElementById("future-milestone").style.display = page == 2 ? "flex" : "none"
    document.getElementById("mountain").hidden = (page != 3)
    document.getElementById("real_milestones").hidden = (page != 4)
    document.getElementById("real_milestones").style.display = page == 4 ? "flex" : "none"
    document.getElementById("buddy").style.display = page == 5 ? "flex" : "none"
}

let analysisPanels = [
    { id: "panel_" + Math.random().toString(36).substr(2, 9), notation: "DBMS", width: 100, hue: 120, height: "150px" },
];

function updatefontsize() {

    const font_size = document.getElementById("font_size").value;

    document.documentElement.style.setProperty(
        "--font-size",
        font_size + "px"
    );

    localStorage.setItem("font-size", font_size);

}

function updatefontfamily() {

    const font_family =
        document.getElementById("font_family").value;

    document.documentElement.style.setProperty(
        "--font-family",
        font_family
    );

    localStorage.setItem(
        "font-family",
        font_family
    );

}

player_time = 0

// Function to save all settings on the page to localStorage
//actually stores all local data (because why not, i will confuse him until he gives up the contributor rank)
function saveAllSettings() {
    const settings = {
        // Display Settings
        font_family: document.getElementById("font_family").value,
        font_size: Number(document.getElementById("font_size").value),

        // Notation Settings
        compress_bms: document.getElementById("compress_bms").checked,
        format_cOCF: document.getElementById("format_cOCF").checked,

        // Performance Settings
        Y_Terms: Number(document.getElementById("Y_Terms").value),
        BMS_Terms: Number(document.getElementById("BMS_Terms").value),

        // Milestone Settings
        Scratch_bar_height: Number(document.getElementById("Scratch_bar_height").value),

        // Visualizer (Mountain) Settings - Sizing
        ROWHEIGHT: Number(document.getElementById("ROWHEIGHT").value),
        COLUMNWIDTH: Number(document.getElementById("COLUMNWIDTH").value),
        LINETHICKNESS: Number(document.getElementById("LINETHICKNESS").value),
        NUMBERSIZE: Number(document.getElementById("NUMBERSIZE").value),
        NUMBERTHICKNESS: Number(document.getElementById("NUMBERTHICKNESS").value),

        // Visualizer Settings - Dimensions
        MAXDIMENSIONS: Number(document.getElementById("MAXDIMENSIONS").value),
        MaxTerms: Number(document.getElementById("MaxTerms").value),

        // Visualizer Settings - Toggles
        STACKMODE: document.getElementById("STACKMODE").checked,
        HIGHLIGHT: document.getElementById("HIGHLIGHT").checked,
        EXTRADIVIDER: document.getElementById("EXTRADIVIDER").checked,
        _UPDATEMODE: document.getElementById("_UPDATEMODE").checked,
    };
    localStorage.setItem("lngi_app_settings", JSON.stringify(settings));
}

function saveMisc() {
    const misc = {
        //time based events
        time: player_time
    }
    localStorage.setItem("lngi_app_misc", JSON.stringify(misc))
}

function loadMisc() {
    const savedData = localStorage.getItem("lngi_app_misc");
    if (!savedData) return;

    try {
        const settings = JSON.parse(savedData);
        player_time = settings.time
    }
    catch (e) {
        console.log("something went wrong when loading misc settings", e)
    }
}

// Function to load all settings back from localStorage
function loadAllSettings() {
    const savedData = localStorage.getItem("lngi_app_settings");
    if (!savedData) return;

    try {
        const settings = JSON.parse(savedData);

        // Helper function to safely apply values if they exist in storage
        const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
        const setCheck = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.checked = val; };

        // Apply values
        setVal("font_family", settings.font_family);
        setVal("font_size", settings.font_size);
        setCheck("compress_bms", settings.compress_bms);
        setCheck("format_cOCF", settings.format_cOCF);
        setVal("Y_Terms", settings.Y_Terms);
        setVal("BMS_Terms", settings.BMS_Terms);
        setVal("Scratch_bar_height", settings.Scratch_bar_height);
        setVal("ROWHEIGHT", settings.ROWHEIGHT);
        setVal("COLUMNWIDTH", settings.COLUMNWIDTH);
        setVal("LINETHICKNESS", settings.LINETHICKNESS);
        setVal("NUMBERSIZE", settings.NUMBERSIZE);
        setVal("NUMBERTHICKNESS", settings.NUMBERTHICKNESS);
        setVal("MAXDIMENSIONS", settings.MAXDIMENSIONS);
        setVal("MaxTerms", settings.MaxTerms);
        setCheck("STACKMODE", settings.STACKMODE);
        setCheck("HIGHLIGHT", settings.HIGHLIGHT);
        setCheck("EXTRADIVIDER", settings.EXTRADIVIDER);
        setCheck("_UPDATEMODE", settings._UPDATEMODE);

        // Trigger existing CSS rule updates
        if (typeof updatefontfamily === "function") updatefontfamily();
        if (typeof updatefontsize === "function") updatefontsize();
        if (document.getElementById("Scratch_bar_height")) {
            document.documentElement.style.setProperty("--scratch-bar-height", settings.Scratch_bar_height + "px");
        }
    } catch (e) {
        console.error("Failed to parse settings from localStorage:", e);
    }
}

// Automatically attach event listeners to save settings instantly whenever a change occurs
function attachAutoSaveListeners() {
    const selectorIds = [
        "font_family", "font_size", "compress_bms", "format_cOCF",
        "Y_Terms", "BMS_Terms", "Scratch_bar_height", 
        "ROWHEIGHT", "COLUMNWIDTH", "LINETHICKNESS", "NUMBERSIZE", "NUMBERTHICKNESS",
        "MAXDIMENSIONS", "MaxTerms", "STACKMODE", "HIGHLIGHT", "EXTRADIVIDER", "_UPDATEMODE"
    ];

    selectorIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Using 'input' captures slider movements, checkboxes, and typing in real-time
            el.addEventListener("input", saveAllSettings);
        }
    });
}

function flashButtonText(button, text, duration = 2000) {
    const original = button.textContent;
    button.textContent = text;
    button.disabled = true;

    setTimeout(() => {
        button.textContent = original;
        button.disabled = false;
    }, duration);
}

const btnSave = document.getElementById("btn_save_layout");
btnSave.onclick = () => {
    const serializedPanels = analysisPanels.map(panel => ({
        notation: panel.notation,
        width: panel.width,
        hue: panel.hue,
        height: panel.height || "150px"
    }));

    localStorage.setItem("lngi_layout_save", JSON.stringify(serializedPanels));

    flashButtonText(btnSave, "Saved!");
};

const btnLoad = document.getElementById("btn_load_layout");
btnLoad.onclick = () => {
    const rawData = localStorage.getItem("lngi_layout_save");
    if (!rawData) return;

    try {
        const parsedLayout = JSON.parse(rawData);

        analysisPanels = parsedLayout.map(panel => ({
            id: "panel_" + Math.random().toString(36).substr(2, 9),
            notation: panel.notation,
            width: panel.width,
            hue: panel.hue,
            height: panel.height
        }));

        renderAnalysisPanels();

        flashButtonText(btnLoad, "Loaded!");
    } catch (e) {
        console.error(e);
    }
};

// Initialize on page setup
document.addEventListener("DOMContentLoaded", () => {
    loadAllSettings();
    loadMisc();
    attachAutoSaveListeners();
});

