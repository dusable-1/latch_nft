const $ = (id) => document.getElementById(id);

const state = {
  imgDataUrl: "",
  bg: "#5D6670",
  pattern: "fleur",
  model: "Cucumber"
};

const BG_LIST = ["#5D6670","#2E6BEA","#7B44FF","#2FAE6A","#FF6B2E","#1F2430"];

function toast(msg){
  const t = $("toast");
  t.innerHTML = `<div>${escapeHtml(msg)}</div>`;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 1600);
}

function setPattern(el, kind){
  el.style.backgroundSize = "52px 52px";
  el.style.backgroundImage = patternCss(kind);
}

function patternCss(kind){
  const base = "rgba(255,255,255,0.14)";
  if (kind === "fleur") {
    return `radial-gradient(circle at 16px 16px, ${base} 2px, transparent 2px),
            radial-gradient(circle at 36px 36px, rgba(255,255,255,0.10) 2px, transparent 2px)`;
  }
  if (kind === "triangles") {
    return `linear-gradient(60deg, rgba(255,255,255,0.10) 12%, transparent 12% 88%, rgba(255,255,255,0.10) 88%),
            linear-gradient(-60deg, rgba(255,255,255,0.08) 12%, transparent 12% 88%, rgba(255,255,255,0.08) 88%)`;
  }
  if (kind === "runes") {
    return `radial-gradient(circle at 14px 14px, rgba(255,255,255,0.10) 2px, transparent 2px),
            radial-gradient(circle at 30px 30px, rgba(255,255,255,0.07) 2px, transparent 2px),
            radial-gradient(circle at 46px 46px, rgba(255,255,255,0.09) 2px, transparent 2px)`;
  }
  if (kind === "pistols") {
    return `radial-gradient(circle at 14px 18px, rgba(255,255,255,0.10) 2px, transparent 2px),
            radial-gradient(circle at 32px 36px, rgba(255,255,255,0.07) 2px, transparent 2px)`;
  }
  return `radial-gradient(circle at 12px 12px, rgba(255,255,255,0.10) 2px, transparent 2px),
          radial-gradient(circle at 34px 34px, rgba(255,255,255,0.06) 2px, transparent 2px)`;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// Resize/compress to keep JSON sane (MVP)
async function fileToDataUrl(file){
  const img = await createImageBitmap(file);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,size,size);

  // contain
  const ratio = Math.min(size/img.width, size/img.height);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const x = Math.round((size - w)/2);
  const y = Math.round((size - h)/2);
  ctx.drawImage(img, x, y, w, h);

  // jpeg to reduce (fine for UI)
  return canvas.toDataURL("image/jpeg", 0.86);
}

function goStep(n){
  $("step1").classList.toggle("hidden", n !== 1);
  $("step2").classList.toggle("hidden", n !== 2);
  $("step3").classList.toggle("hidden", n !== 3);
}

function updatePreviewAll(){
  // step1
  $("hero").style.background = state.bg;
  setPattern($("heroPattern"), state.pattern);

  // step2
  $("hero2").style.background = state.bg;
  setPattern($("heroPattern2"), state.pattern);

  // names
  const nm = $("fName")?.value?.trim() || "NFT";
  $("pName").textContent = nm;
  $("pName2").textContent = nm;

  const rub = Number($("fEstRub")?.value || 0);
  const ton = Number($("fPriceTon")?.value || 0);
  const st = Number($("fSharesTotal")?.value || 0);
  const sp = Number($("fSharePriceTon")?.value || 0);

  $("pSub2").textContent = `# будет присвоен · ~${Math.round(rub)} ₽`;

  $("iModel").textContent = state.model;
  $("iPattern").textContent = state.pattern;
  $("iBg").textContent = state.bg;
  $("iRub").textContent = `${Math.round(rub)} ₽`;
  $("iTon").textContent = `${ton.toFixed(2)} TON`;
  $("iShares").textContent = `${st} · ${sp.toFixed(4)} TON/доля`;

  const isA = $("fAuction")?.checked;
  $("iAuction").textContent = isA ? `${Number($("fBidStart").value||0).toFixed(2)} TON · ${$("fAuctionDur").value}` : "выкл";
}

// Swatches
function renderSwatches(){
  const box = $("swatches");
  box.innerHTML = BG_LIST.map(c=>`
    <div class="sw ${c===state.bg?"active":""}" data-c="${c}" style="background:${c}"></div>
  `).join("");
  box.querySelectorAll(".sw").forEach(el=>{
    el.onclick = () => {
      state.bg = el.dataset.c;
      renderSwatches();
      updatePreviewAll();
    };
  });
}

// Upload
const drop = $("drop");
drop.onclick = () => $("file").click();
drop.ondragover = (e) => { e.preventDefault(); drop.style.opacity = ".9"; };
drop.ondragleave = () => { drop.style.opacity = "1"; };
drop.ondrop = async (e) => {
  e.preventDefault(); drop.style.opacity = "1";
  const f = e.dataTransfer.files?.[0];
  if (f) await handleFile(f);
};
$("file").onchange = async (e) => {
  const f = e.target.files?.[0];
  if (f) await handleFile(f);
};

async function handleFile(file){
  toast("Обрабатываем изображение…");
  state.imgDataUrl = await fileToDataUrl(file);

  for (const id of ["previewImg","previewImg2"]) {
    const im = $(id);
    im.src = state.imgDataUrl;
    im.onload = () => im.classList.add("ready");
  }

  $("toStep2").disabled = false;
  toast("Готово. Можно продолжать.");
}

// Step navigation
$("toStep2").onclick = () => {
  goStep(2);
  $("fName").value = $("fName").value || "Ice Cream";
  renderSwatches();
  updatePreviewAll();
};

$("back1").onclick = () => goStep(1);

$("again").onclick = () => {
  location.reload();
};

// Form events
["fName","fModel","fPattern","fBgCustom","fEstRub","fPriceTon","fSharesTotal","fSharePriceTon","fAuction","fBidStart","fAuctionDur"]
.forEach(id=>{
  const el = $(id);
  if (!el) return;
  el.oninput = () => {
    if (id === "fModel") state.model = el.value;
    if (id === "fPattern") state.pattern = el.value;
    if (id === "fBgCustom") {
      const v = el.value.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(v)) state.bg = v;
      renderSwatches();
    }
    if (id === "fAuction") $("auctionBox").style.display = el.checked ? "grid" : "none";
    updatePreviewAll();
  };
  el.onchange = el.oninput;
});

$("randomize").onclick = () => {
  state.model = ["Cucumber","Smokefest","Cinematic","Doggystyle"][Math.floor(Math.random()*4)];
  state.pattern = ["fleur","pistols","runes","triangles"][Math.floor(Math.random()*4)];
  state.bg = BG_LIST[Math.floor(Math.random()*BG_LIST.length)];
  $("fModel").value = state.model;
  $("fPattern").value = state.pattern;
  $("fBgCustom").value = "";
  renderSwatches();
  updatePreviewAll();
  toast("Случайно выбрано");
};

$("create").onclick = async () => {
  if (!state.imgDataUrl) return toast("Сначала загрузите изображение");

  const payload = {
    name: $("fName").value.trim() || "NFT",
    img: state.imgDataUrl,
    bg: state.bg,
    pattern: state.pattern,
    model: state.model,
    estRub: Number($("fEstRub").value || 999),
    priceTon: Number($("fPriceTon").value || 1),
    sharesTotal: Number($("fSharesTotal").value || 1000),
    sharesSold: 0,
    sharePriceTon: Number($("fSharePriceTon").value || 0.001),
    auctionActive: Boolean($("fAuction").checked),
    auctionTopBidTon: Number($("fAuction").checked ? ($("fBidStart").value || 0) : 0),
    auctionEnds: $("fAuction").checked ? $("fAuctionDur").value : "—",
    owner: "Вы"
  };

  toast("Сохраняем…");
  try {
    const r = await fetch("/api/nfts", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "Save failed");

    $("doneTitle").textContent = `NFT создан: ${payload.name}`;
    $("doneSub").textContent = `ID: ${j.item.id} · ${j.item.num}`;
    goStep(3);
    toast("Успешно");
  } catch (e) {
    toast("Ошибка: " + String(e.message || e));
  }
};

// init
goStep(1);
renderSwatches();
updatePreviewAll();
