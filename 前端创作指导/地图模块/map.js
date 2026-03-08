const sampleMap = `<map>
SCENE_CONTEXT_ID: town_generic
MAP_NAME: 示例城镇
DIMENSIONS: 9x7
DEFAULT_TILE: .
RAW_MAP_START
#########
#..C...Z#
#..C....#
#..P..W.#
#....K..#
#..Z....#
#########
RAW_MAP_END
</map>`;

const SceneContextManager = {
  contexts: {
    town_generic: {
      name: "城镇",
      scale: "local",
      defaultTileSymbol: ".",
      tilesetUrl: "https://pub-0f03753252fb439e966a538d805f20ef.r2.dev/docs/1746769798811.png",
      symbolMap: {
        "#": { name: "障碍物", cssClassSuffix: "rock-small", defaultInteract: [], defaultDesc: "无法通行的障碍物。" },
        ".": { name: "草地", cssClassSuffix: "grass-dark", defaultInteract: [], defaultDesc: "一片普通的草地。" },
        "C": { name: "普通房屋", cssClassSuffix: "building-roof-brown", defaultInteract: ["敲门"], defaultDesc: "一栋普通的民居。" },
        "P": { name: "玩家", cssClassSuffix: "player-avatar", defaultInteract: [], defaultDesc: "你在这里。" },
        "Z": { name: "城镇居民", cssClassSuffix: "npc-figure", defaultInteract: ["交谈"], defaultDesc: "一位城镇居民。" },
        "K": { name: "商店", cssClassSuffix: "shop-awning", defaultInteract: ["进入商店"], defaultDesc: "一家挂着招牌的商店。" },
        "W": { name: "水井", cssClassSuffix: "chest-wooden", defaultInteract: ["查看水井"], defaultDesc: "一口石头砌成的水井。" }
      }
    },
    forest_path: {
      name: "森林",
      scale: "local",
      defaultTileSymbol: ".",
      tilesetUrl: "https://pub-0f03753252fb439e966a538d805f20ef.r2.dev/docs/1746769798811.png",
      symbolMap: {
        "#": { name: "茂密树木", cssClassSuffix: "forest-dense-tree", defaultInteract: [], defaultDesc: "茂密的树木，无法通过。" },
        ".": { name: "林间土地", cssClassSuffix: "forest-floor-dirt", defaultInteract: [], defaultDesc: "覆盖着落叶的泥土小径。" },
        "C": { name: "树干", cssClassSuffix: "forest-tree-trunk", defaultInteract: ["检查树木"], defaultDesc: "一颗粗壮的树干。" },
        "P": { name: "玩家", cssClassSuffix: "player-avatar", defaultInteract: [], defaultDesc: "你正走在林间。" },
        "Z": { name: "林地生物", cssClassSuffix: "npc-figure", defaultInteract: ["观察"], defaultDesc: "一只小动物或林地居民。" },
        "W": { name: "溪流", cssClassSuffix: "water-surface", defaultInteract: ["查看水流"], defaultDesc: "一条清澈的溪流。" },
        "B": { name: "灌木丛", cssClassSuffix: "forest-bush", defaultInteract: ["搜索灌木丛"], defaultDesc: "一簇茂密的灌木。" },
        "T": { name: "宝箱", cssClassSuffix: "chest-wooden", defaultInteract: ["打开宝箱"], defaultDesc: "一个普通的木制宝箱。" },
        "M": { name: "怪物", cssClassSuffix: "monster-figure", defaultInteract: ["战斗"], defaultDesc: "潜伏的危险！" }
      }
    },
    country_map: {
      name: "国家地图",
      scale: "regional",
      defaultTileSymbol: ".",
      tilesetUrl: "https://pub-0f03753252fb439e966a538d805f20ef.r2.dev/docs/1746769798811.png",
      symbolMap: {
        "#": { name: "山脉", cssClassSuffix: "mountain-green", defaultInteract: [], defaultDesc: "连绵的山脉。" },
        ".": { name: "平原/地区", cssClassSuffix: "grass-light", defaultInteract: [], defaultDesc: "广阔的平原或地区。" },
        "C": { name: "首都", cssClassSuffix: "location-capital", defaultInteract: ["查看详情"], defaultDesc: "国家的首都。" },
        "P": { name: "当前位置", cssClassSuffix: "location-player", defaultInteract: ["查看详情"], defaultDesc: "你目前所在的区域。" },
        "Z": { name: "其他城市/省份", cssClassSuffix: "location-city", defaultInteract: ["查看详情"], defaultDesc: "其他重要的城市或区域。" },
        "R": { name: "河流/水域", cssClassSuffix: "water-surface", defaultInteract: [], defaultDesc: "主要的河流或湖泊。" },
        "~": { name: "边界/水域", cssClassSuffix: "water-surface", defaultInteract: [], defaultDesc: "地图边界或水域。" }
      }
    }
  },
  getContext(id) {
    return this.contexts[id] || this.contexts.town_generic;
  },
  getTileDefinition(sceneContext, symbol, symbolDefinitions = {}) {
    let contextDef = sceneContext.symbolMap[symbol];
    if (!contextDef && symbol !== sceneContext.defaultTileSymbol) {
      const fallback = sceneContext.defaultTileSymbol || ".";
      contextDef = sceneContext.symbolMap[fallback];
    }

    const base = contextDef || {
      name: `(${symbol})`,
      cssClassSuffix: "unknown",
      defaultInteract: [],
      defaultDesc: "",
      properties: {}
    };

    const custom = symbolDefinitions[symbol] || {};
    const combined = { ...base };

    if (custom.name !== undefined) combined.name = custom.name;
    if (custom.description !== undefined) combined.description = custom.description;
    if (custom.default_interact !== undefined) combined.defaultInteract = custom.default_interact;
    if (custom.properties !== undefined) combined.properties = { ...(base.properties || {}), ...custom.properties };

    if (custom.css_class !== undefined) {
      combined.css_class_full = custom.css_class;
      combined.cssClassSuffix = undefined;
    } else if (custom.css_class_suffix !== undefined) {
      combined.cssClassSuffix = custom.css_class_suffix;
      combined.css_class_full = undefined;
    }

    combined.description = combined.description || base.defaultDesc || "";
    combined.name = combined.name || `符号 ${symbol}`;
    combined.defaultInteract = combined.defaultInteract || [];
    combined.properties = combined.properties || {};
    return combined;
  }
};

function parseMapBlock(inputText) {
  const mapMatch = /<map>([\s\S]*?)<\/map>/;
  const match = mapMatch.exec(inputText);
  const rawContent = match ? match[1] : inputText;

  const normalized = rawContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const lines = normalized.split("\n");

  const mapData = { raw_map_array: [], instance_metadata: {}, symbol_definitions: {} };
  let currentSection = null;
  let rawMapLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed && currentSection !== "raw_map") continue;

    if (trimmed.startsWith("SCENE_CONTEXT_ID:")) mapData.scene_context_id = trimmed.slice(17).trim();
    else if (trimmed.startsWith("MAP_ID:")) mapData.id = trimmed.slice(7).trim();
    else if (trimmed.startsWith("MAP_NAME:")) mapData.name = trimmed.slice(9).trim();
    else if (trimmed.startsWith("TILESET_HINT:")) mapData.tileset_hint = trimmed.slice(13).trim();
    else if (trimmed.startsWith("DIMENSIONS:")) {
      const dims = trimmed.slice(11).trim().split("x");
      if (dims.length === 2) {
        mapData.cols = parseInt(dims[0], 10);
        mapData.rows = parseInt(dims[1], 10);
      }
    }
    else if (trimmed.startsWith("DEFAULT_TILE:")) mapData.default_tile = trimmed.slice(13).trim();
    else if (trimmed === "RAW_MAP_START") currentSection = "raw_map";
    else if (trimmed === "RAW_MAP_END") {
      if (rawMapLines.length > 0) mapData.raw_map_array = rawMapLines.map(r => r.split(""));
      rawMapLines = [];
      currentSection = null;
    }
    else if (trimmed === "INSTANCE_METADATA_START") currentSection = "instance_metadata";
    else if (trimmed === "INSTANCE_METADATA_END") currentSection = null;
    else if (trimmed === "SYMBOL_DEFINITIONS_START") currentSection = "symbol_definitions";
    else if (trimmed === "SYMBOL_DEFINITIONS_END") currentSection = null;
    else {
      if (currentSection === "raw_map") {
        if (trimmed) rawMapLines.push(trimmed);
      } else if (currentSection === "instance_metadata" && trimmed) {
        const parts = trimmed.split("|");
        const coords = parts[0];
        if (parts.length >= 3) {
          const sym = parts[1];
          let id = `${sym}_${coords}`;
          let instName = parts[2] || "";
          let instDesc = parts[3] || "";
          let instInteract = [];
          let instProps = {};
          if (parts[4] && parts[4].trim()) instInteract = JSON.parse(parts[4]);
          if (parts[5] && parts[5].trim()) instProps = JSON.parse(parts[5]);
          mapData.instance_metadata[coords] = {
            symbol_at_xy: sym,
            instance_id: id,
            name: instName,
            description: instDesc,
            interact: instInteract,
            properties: instProps
          };
        }
      } else if (currentSection === "symbol_definitions" && trimmed) {
        const defParts = trimmed.match(/^(.+?):\s*(\{.*\})$/);
        if (defParts && defParts.length === 3) {
          const key = defParts[1].trim();
          const val = JSON.parse(defParts[2].trim());
          mapData.symbol_definitions[key] = val;
        }
      }
    }
  }

  if (mapData.raw_map_array.length > 0 && (!mapData.rows || !mapData.cols)) {
    mapData.rows = mapData.raw_map_array.length;
    mapData.cols = mapData.raw_map_array[0] ? mapData.raw_map_array[0].length : 0;
  }

  return mapData;
}

const UI = {
  currentMap: null,
  currentContext: null,
  zoom: 1,

  updateMap(mapData) {
    const grid = document.getElementById("map-grid");
    const mapName = document.getElementById("map-name");
    const sceneName = document.getElementById("scene-name");
    const tileInfo = document.getElementById("tile-info-content");

    grid.innerHTML = "";
    tileInfo.textContent = "悬停地图地点查看详情。";

    if (!mapData || !mapData.scene_context_id || !mapData.raw_map_array.length) {
      mapName.textContent = mapData?.name || "未知";
      sceneName.textContent = "未知";
      this.updateLegend(null, {});
      return;
    }

    this.currentMap = mapData;
    this.currentContext = SceneContextManager.getContext(mapData.scene_context_id);

    const tilesetUrl = mapData.tileset_hint || this.currentContext.tilesetUrl;
    if (tilesetUrl) {
      document.documentElement.style.setProperty("--tileset-url", `url('${tilesetUrl}')`);
    }

    mapName.textContent = mapData.name || "未命名地图";
    sceneName.textContent = this.currentContext.name || mapData.scene_context_id;

    const cols = mapData.cols;
    const rows = mapData.rows;
    grid.style.gridTemplateColumns = `repeat(${cols}, var(--tile-size))`;
    grid.style.gridTemplateRows = `repeat(${rows}, var(--tile-size))`;

    const rawMap = mapData.raw_map_array;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const symbol = (rawMap[r] && rawMap[r][c]) || mapData.default_tile || this.currentContext.defaultTileSymbol || ".";
        const def = SceneContextManager.getTileDefinition(this.currentContext, symbol, mapData.symbol_definitions);

        const tile = document.createElement("div");
        tile.className = "map-tile";
        if (def.css_class_full) tile.classList.add(def.css_class_full);
        else if (def.cssClassSuffix) tile.classList.add(`tile-${def.cssClassSuffix}`);
        else tile.classList.add("tile-unknown");

        tile.dataset.row = r;
        tile.dataset.col = c;
        tile.dataset.symbol = symbol;

        tile.addEventListener("mouseenter", () => this.updateTileInfo(tile));
        grid.appendChild(tile);
      }
    }

    this.updateLegend(this.currentContext, mapData.symbol_definitions);
    this.applyZoom(this.zoom);
  },

  updateTileInfo(tile) {
    const content = document.getElementById("tile-info-content");
    if (!this.currentMap || !this.currentContext) return;

    const symbol = tile.dataset.symbol;
    const row = Number(tile.dataset.row);
    const col = Number(tile.dataset.col);
    const def = SceneContextManager.getTileDefinition(this.currentContext, symbol, this.currentMap.symbol_definitions || {});

    const instanceKey = `${col},${row}`;
    const instance = this.currentMap.instance_metadata[instanceKey];

    const name = instance?.name || def.name || `符号 ${symbol}`;
    const desc = instance?.description || def.description || "";

    content.innerHTML = `<div><strong>${name}</strong></div><div>${desc || "无描述"}</div>`;
  },

  updateLegend(sceneContext, symbolDefinitions) {
    const list = document.getElementById("legend-list");
    list.innerHTML = "";

    if (!sceneContext) {
      list.innerHTML = "<li>无图例</li>";
      return;
    }

    const symbols = new Set();
    if (this.currentMap?.raw_map_array) {
      this.currentMap.raw_map_array.flat().forEach(s => {
        if (s && s !== sceneContext.defaultTileSymbol && s !== "P") symbols.add(s);
      });
    }

    let added = 0;
    symbols.forEach(symbol => {
      const def = SceneContextManager.getTileDefinition(sceneContext, symbol, symbolDefinitions || {});
      if (!def || !def.name) return;
      const li = document.createElement("li");
      const sample = document.createElement("span");
      sample.className = "legend-tile";
      if (def.css_class_full) sample.classList.add(def.css_class_full);
      else if (def.cssClassSuffix) sample.classList.add(`tile-${def.cssClassSuffix}`);
      else sample.classList.add("tile-unknown");

      li.appendChild(sample);
      li.appendChild(document.createTextNode(def.name));
      list.appendChild(li);
      added += 1;
    });

    if (added === 0) list.innerHTML = "<li>无特殊图例项</li>";
  },

  applyZoom(z) {
    const grid = document.getElementById("map-grid");
    const label = document.getElementById("zoom-level");
    grid.style.transform = `scale(${z})`;
    label.textContent = `${Math.round(z * 100)}%`;
  }
};

function bindEvents() {
  const input = document.getElementById("map-input");
  const renderBtn = document.getElementById("render-map");
  const zoomIn = document.getElementById("zoom-in");
  const zoomOut = document.getElementById("zoom-out");

  input.value = sampleMap;

  renderBtn.addEventListener("click", () => {
    const mapData = parseMapBlock(input.value);
    UI.updateMap(mapData);
  });

  zoomIn.addEventListener("click", () => {
    UI.zoom = Math.min(4, UI.zoom + 0.5);
    UI.applyZoom(UI.zoom);
  });

  zoomOut.addEventListener("click", () => {
    UI.zoom = Math.max(1, UI.zoom - 0.5);
    UI.applyZoom(UI.zoom);
  });

  UI.updateMap(parseMapBlock(input.value));
}

window.addEventListener("DOMContentLoaded", bindEvents);
