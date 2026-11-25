"use strict";

/* ========================================
   INVENTARIO ECCI
   ======================================== */

const STORAGE_KEY = "ecci_inventory_products";
const MOVEMENTS_KEY = "ecci_inventory_movements";

let products = loadData(STORAGE_KEY, []);
let movements = loadData(MOVEMENTS_KEY, []);
let toastTimer;

/* ========================================
   PRODUCTOS INICIALES
   ======================================== */

const DEFAULT_PRODUCTS = [
  {
    id:"ecci-default-01",
    name:"Yogur líquido (Colanta / Finesse)",
    code:"YOG-001",
    kitchen:"La Scala",
    category:"Buffet",
    unit:"Botellas",
    content:1500,
    contentUnit:"ml",
    cd:1,
    min:2,
    pr:4,
    max:6,
    quantity:12,
    expiry:"",
    notes:""
  },
  {
    id:"ecci-default-02",
    name:"Queso doble crema (250 g)",
    code:"QUE-001",
    kitchen:"La Scala",
    category:"Spa y Buffet",
    unit:"Unidades",
    content:250,
    contentUnit:"g",
    cd:2,
    min:4,
    pr:8,
    max:14,
    quantity:32,
    expiry:"",
    notes:""
  },
  {
    id:"ecci-default-03",
    name:"Leche entera UHT",
    code:"LEC-001",
    kitchen:"La Scala",
    category:"Buffet",
    unit:"Litros",
    content:1,
    contentUnit:"L",
    cd:6,
    min:12,
    pr:18,
    max:30,
    quantity:10,
    expiry:"",
    notes:""
  },
  {
    id:"ecci-default-04",
    name:"Jamón de pierna tajado",
    code:"JAM-001",
    kitchen:"La Scala",
    category:"Buffet",
    unit:"Paquetes",
    content:500,
    contentUnit:"g",
    cd:2,
    min:4,
    pr:6,
    max:10,
    quantity:4,
    expiry:"",
    notes:""
  },
  {
    id:"ecci-default-05",
    name:"Bresaola",
    code:"BRE-001",
    kitchen:"El Mirador",
    category:"Carta / Eventos",
    unit:"Paquetes",
    content:100,
    contentUnit:"g",
    cd:0,
    min:0,
    pr:0,
    max:1,
    quantity:7,
    expiry:"",
    notes:""
  },
  {
    id:"ecci-default-06",
    name:"Yogur griego",
    code:"YOG-002",
    kitchen:"La Scala",
    category:"Buffet",
    unit:"Tarros",
    content:1,
    contentUnit:"unidades",
    cd:0,
    min:0,
    pr:0,
    max:1,
    quantity:2,
    expiry:"",
    notes:""
  },
  {
    id:"ecci-default-07",
    name:"Tofu",
    code:"TOF-001",
    kitchen:"El Mirador",
    category:"Carta",
    unit:"Paquetes",
    content:250,
    contentUnit:"g",
    cd:0,
    min:0,
    pr:0,
    max:1,
    quantity:0,
    expiry:"",
    notes:""
  }
];

/* ========================================
   ALMACENAMIENTO
   ======================================== */

function loadData(key,fallback){
  try{
    const value=localStorage.getItem(key);
    return value?JSON.parse(value):fallback;
  }catch(error){
    console.error(error);
    return fallback;
  }
}

function saveData(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(products));
  localStorage.setItem(MOVEMENTS_KEY,JSON.stringify(movements));
}

function addDefaultProducts(){
  const existingIds=new Set(products.map(p=>p.id));
  const existingCodes=new Set(
    products.map(p=>(p.code||"").toLowerCase()).filter(Boolean)
  );

  DEFAULT_PRODUCTS.forEach(p=>{
    if(!existingIds.has(p.id) && !existingCodes.has(p.code.toLowerCase())){
      products.push({...p});
    }
  });

  saveData();
}

/* ========================================
   UTILIDADES
   ======================================== */

function uid(){
  return "inv-"+Date.now().toString(36)+
    Math.random().toString(36).slice(2,7);
}

function escapeHTML(value){
  return String(value??"").replace(/[&<>"']/g,char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  })[char]);
}

function formatNumber(value){
  return Number(value||0).toLocaleString("es-CO",{
    maximumFractionDigits:2
  });
}

function formatDate(date){
  if(!date)return "Sin fecha";

  const parts=date.split("-");
  if(parts.length!==3)return "Sin fecha";

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function dateDifference(date){
  if(!date)return null;

  const [y,m,d]=date.split("-").map(Number);
  const expiry=Date.UTC(y,m-1,d);

  const today=new Date();
  const current=Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return Math.round((expiry-current)/86400000);
}

function showToast(message){
  const toast=document.getElementById("toast");

  toast.textContent=message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer=setTimeout(()=>{
    toast.classList.remove("show");
  },3000);
}

function getProduct(id){
  return products.find(p=>p.id===id);
}

/* ========================================
   ESTADO DE PRODUCTO
   ======================================== */

function stockState(product){
  const qty=Number(product.quantity||0);
  const min=Number(product.min||0);
  const pr=Number(product.pr||0);
  const max=Number(product.max||0);

  if(qty===0){
    return {key:"out",label:"Agotado",color:"red"};
  }

  if(qty<=pr){
    return {key:"low",label:"Punto de reorden",color:"orange"};
  }

  if(qty>max){
    return {key:"over",label:"Sobre el máximo",color:"blue"};
  }

  return {key:"normal",label:"Disponible",color:"green"};
}

function expiryState(product){
  if(!product.expiry)return null;

  const days=dateDifference(product.expiry);

  if(days<0){
    return {key:"expired",label:"Vencido",color:"red",days};
  }

  if(days<=7){
    return {key:"soon",label:"Vence pronto",color:"pink",days};
  }

  if(days<=30){
    return {key:"upcoming",label:"Próximo a vencer",color:"yellow",days};
  }

  return {key:"valid",label:"Vigente",color:"green",days};
}

function pill(text,color){
  return `<span class="badge ${color}">${escapeHTML(text)}</span>`;
}

function presentation(product){
  return `${escapeHTML(product.unit)} · ${formatNumber(product.content)} ${escapeHTML(product.contentUnit)}`;
}

/* ========================================
   ALERTAS
   SOLO:
   - EN PUNTO DE REORDEN / AGOTADOS
   - SOBRE MAXIMO
   - VENCIDOS
   ======================================== */

function productAlerts(product){
  const alerts=[];
  const stock=stockState(product);
  const expiry=expiryState(product);

  if(stock.key==="out"){
    alerts.push({
      color:"red",
      title:"Producto agotado",
      text:`${product.name}: no quedan existencias.`,
      product
    });
  }else if(stock.key==="low"){
    alerts.push({
      color:"orange",
      title:"Punto de reorden",
      text:`${product.name}: ${formatNumber(product.quantity)} disponibles. Reposición requerida.`,
      product
    });
  }

  if(stock.key==="over"){
    alerts.push({
      color:"blue",
      title:"Sobre el máximo",
      text:`${product.name}: tiene ${formatNumber(product.quantity)} unidades y supera el máximo de ${formatNumber(product.max)}.`,
      product
    });
  }

  if(expiry?.key==="expired"){
    alerts.push({
      color:"red",
      title:"Producto vencido",
      text:`${product.name}: venció el ${formatDate(product.expiry)}.`,
      product
    });
  }

  return alerts;
}

function getAllAlerts(){
  return products.flatMap(productAlerts);
}

/* ========================================
   NAVEGACION
   ======================================== */

const pageNames={
  dashboard:"Panel principal",
  products:"Productos",
  movements:"Movimientos",
  alerts:"Alertas"
};

function showView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));

  document.querySelectorAll(".nav-link[data-view]").forEach(b=>{
    b.classList.toggle("active",b.dataset.view===name);
  });

  const target=document.getElementById(name+"View");
  if(target)target.classList.add("active");

  document.getElementById("pageTitle").textContent=pageNames[name]||"Inventario";
  document.getElementById("sidebar").classList.remove("open");
}

document.querySelectorAll("[data-view]").forEach(button=>{
  button.addEventListener("click",()=>{
    showView(button.dataset.view);
  });
});

document.querySelectorAll("[data-go]").forEach(button=>{
  button.addEventListener("click",()=>{
    showView(button.dataset.go);
  });
});

document.getElementById("mobileMenu").addEventListener("click",()=>{
  document.getElementById("sidebar").classList.toggle("open");
});

/* ========================================
   MODALES
   ======================================== */

function openModal(id){
  document.getElementById(id).classList.add("open");
}

function closeModal(id){
  document.getElementById(id).classList.remove("open");
}

document.querySelectorAll("[data-close]").forEach(button=>{
  button.addEventListener("click",()=>{
    closeModal(button.dataset.close);
  });
});

document.querySelectorAll(".modal-backdrop").forEach(backdrop=>{
  backdrop.addEventListener("click",event=>{
    if(event.target===backdrop){
      backdrop.classList.remove("open");
    }
  });
});

/* ========================================
   PRODUCTOS
   ======================================== */

function openProductModal(product=null){
  document.getElementById("productForm").reset();

  document.getElementById("productId").value=product?.id||"";
  document.getElementById("productModalTitle").textContent=product?"Editar producto":"Nuevo producto";

  document.getElementById("productName").value=product?.name||"";
  document.getElementById("productCode").value=product?.code||"";
  document.getElementById("productKitchen").value=product?.kitchen||"La Scala";
  document.getElementById("productCategory").value=product?.category||"";
  document.getElementById("productUnit").value=product?.unit||"Unidades";

  document.getElementById("productContent").value=product?.content??500;
  document.getElementById("productContentUnit").value=product?.contentUnit||"g";

  document.getElementById("productCD").value=product?.cd??0;
  document.getElementById("productMin").value=product?.min??0;
  document.getElementById("productPR").value=product?.pr??0;
  document.getElementById("productMax").value=product?.max??10;
  document.getElementById("productQuantity").value=product?.quantity??0;
  document.getElementById("productExpiry").value=product?.expiry||"";
  document.getElementById("productNotes").value=product?.notes||"";

  openModal("productModal");
}

document.getElementById("quickAdd").addEventListener("click",()=>{
  openProductModal();
});

document.getElementById("addProductBtn").addEventListener("click",()=>{
  openProductModal();
});

document.getElementById("productForm").addEventListener("submit",event=>{
  event.preventDefault();

  const id=document.getElementById("productId").value;

  const data={
    id:id||uid(),
    name:document.getElementById("productName").value.trim(),
    code:document.getElementById("productCode").value.trim(),
    kitchen:document.getElementById("productKitchen").value,
    category:document.getElementById("productCategory").value.trim(),
    unit:document.getElementById("productUnit").value,
    content:Number(document.getElementById("productContent").value),
    contentUnit:document.getElementById("productContentUnit").value,
    cd:Number(document.getElementById("productCD").value),
    min:Number(document.getElementById("productMin").value),
    pr:Number(document.getElementById("productPR").value),
    max:Number(document.getElementById("productMax").value),
    quantity:Number(document.getElementById("productQuantity").value),
    expiry:document.getElementById("productExpiry").value,
    notes:document.getElementById("productNotes").value.trim(),
    updatedAt:new Date().toISOString()
  };

  if(!data.name){
    showToast("Ingresa el nombre del producto.");
    return;
  }

  if(!Number.isFinite(data.content)||data.content<=0){
    showToast("El contenido debe ser mayor a cero.");
    return;
  }

  const nums=[data.cd,data.min,data.pr,data.max,data.quantity];

  if(!nums.every(Number.isFinite)||nums.some(n=>n<0)){
    showToast("Revisa las cantidades.");
    return;
  }

  if(!(data.min<=data.pr && data.pr<=data.max)){
    showToast("Debe cumplirse: mínimo ≤ reorden ≤ máximo.");
    return;
  }

  const duplicateCode=products.some(p=>
    p.id!==id&&data.code&&p.code&&
    p.code.toLowerCase()===data.code.toLowerCase()
  );

  if(duplicateCode){
    showToast("Este código ya está registrado.");
    return;
  }

  if(id){
    products=products.map(p=>p.id===id?{...p,...data}:p);
  }else{
    products.push({...data,createdAt:new Date().toISOString()});
  }

  saveData();
  closeModal("productModal");
  renderAll();
  showToast(id?"Producto actualizado.":"Producto agregado.");
});

/* ========================================
   TABLA DE PRODUCTOS
   ======================================== */

function renderProducts(){
  const query=document.getElementById("productSearch").value.toLowerCase().trim();
  const filter=document.getElementById("statusFilter").value;
  const kitchen=document.getElementById("kitchenFilter").value;

  const list=products.filter(p=>{
    const text=[p.name,p.code,p.category,p.kitchen,p.unit].join(" ").toLowerCase();

    const matchSearch=text.includes(query);
    const matchKitchen=kitchen==="all"||p.kitchen===kitchen;

    const stock=stockState(p).key;
    const expiry=expiryState(p)?.key;

    const matchStatus=filter==="all"||filter===stock||filter===expiry;

    return matchSearch&&matchKitchen&&matchStatus;
  });

  const tbody=document.getElementById("productsTable");

  if(!list.length){
    tbody.innerHTML=`<tr><td colspan="11"><div class="empty-state">No se encontraron productos.</div></td></tr>`;
  }else{
    tbody.innerHTML=list.map(p=>{
      const stock=stockState(p);
      const expiry=expiryState(p);

      // El estado de stock se muestra una sola vez en esta columna.
      const status=pill(stock.label,stock.color);

      const kitchenClass=p.kitchen==="El Mirador"?"mirador":"";
      const expiryClass=expiry?.key==="expired"?"expiry-danger":expiry?.key==="soon"||expiry?.key==="upcoming"?"expiry-warning":"";

      return `
      <tr>
        <td><div class="product-details"><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.category||"General")} · ${escapeHTML(p.code||"Sin código")}</small></div></td>
        <td><span class="kitchen-tag ${kitchenClass}">${escapeHTML(p.kitchen||"—")}</span></td>
        <td>${presentation(p)}</td>
        <td>${formatNumber(p.cd)}</td>
        <td class="number-warning">${formatNumber(p.min)}</td>
        <td class="number-warning">${formatNumber(p.pr)}</td>
        <td>${formatNumber(p.max)}</td>
        <td><div class="stock-control"><button data-stock="-1" data-id="${escapeHTML(p.id)}">−</button><strong>${formatNumber(p.quantity)}</strong><button data-stock="1" data-id="${escapeHTML(p.id)}">+</button></div></td>
        <td class="${expiryClass}">${formatDate(p.expiry)}</td>
        <td>${status}</td>
        <td><div class="row-actions"><button class="icon-btn" data-edit="${escapeHTML(p.id)}" title="Editar">✎</button><button class="icon-btn" data-move="${escapeHTML(p.id)}" title="Movimiento">⇄</button><button class="icon-btn delete" data-delete="${escapeHTML(p.id)}" title="Eliminar">×</button></div></td>
      </tr>`;
    }).join("");
  }

  document.getElementById("productsFooter").textContent=`Mostrando ${list.length} de ${products.length} productos`;
}

document.getElementById("productsTable").addEventListener("click",event=>{
  const edit=event.target.closest("[data-edit]");
  const del=event.target.closest("[data-delete]");
  const move=event.target.closest("[data-move]");
  const stock=event.target.closest("[data-stock]");

  if(edit){
    const p=getProduct(edit.dataset.edit);
    if(p)openProductModal(p);
  }

  if(del){
    const p=getProduct(del.dataset.delete);
    if(p&&confirm(`¿Eliminar ${p.name}?`)){
      products=products.filter(x=>x.id!==p.id);
      saveData();
      renderAll();
      showToast("Producto eliminado.");
    }
  }

  if(move)openMovementModal(move.dataset.move);

  if(stock){
    const p=getProduct(stock.dataset.id);
    const amount=Number(stock.dataset.stock);

    if(p){
      const newQuantity=Number(p.quantity)+amount;

      if(newQuantity<0){
        showToast("No hay existencias suficientes.");
        return;
      }

      p.quantity=newQuantity;

      movements.unshift({
        id:uid(),
        productId:p.id,
        productName:p.name,
        kitchen:p.kitchen,
        type:amount>0?"entrada":"salida",
        quantity:Math.abs(amount),
        detail:"Ajuste rápido",
        result:newQuantity,
        date:new Date().toISOString()
      });

      saveData();
      renderAll();
      showToast("Cantidad actualizada.");
    }
  }
});

document.getElementById("productSearch").addEventListener("input",renderProducts);
document.getElementById("statusFilter").addEventListener("change",renderProducts);
document.getElementById("kitchenFilter").addEventListener("change",renderProducts);

/* ========================================
   MOVIMIENTOS
   ======================================== */

function openMovementModal(productId=""){
  const select=document.getElementById("movementProduct");

  select.innerHTML=products.map(p=>`
    <option value="${escapeHTML(p.id)}">${escapeHTML(p.name)} (${escapeHTML(p.kitchen||"")})</option>
  `).join("");

  document.getElementById("movementForm").reset();

  if(productId)select.value=productId;
  document.getElementById("movementQuantity").value="";
  document.getElementById("movementDetail").value="";

  if(!products.length){
    showToast("Primero agrega un producto.");
    return;
  }

  openModal("movementModal");
}

document.getElementById("newMovementBtn").addEventListener("click",()=>{
  openMovementModal();
});

document.getElementById("movementForm").addEventListener("submit",event=>{
  event.preventDefault();

  const product=getProduct(document.getElementById("movementProduct").value);
  const type=document.getElementById("movementType").value;
  const quantity=Number(document.getElementById("movementQuantity").value);
  const detail=document.getElementById("movementDetail").value.trim();

  if(!product||!Number.isFinite(quantity)||quantity<=0){
    showToast("Revisa la cantidad.");
    return;
  }

  let result=Number(product.quantity);

  if(type==="entrada"){
    result+=quantity;
  }else{
    if(quantity>result){
      showToast("No puedes retirar más de lo disponible.");
      return;
    }
    result-=quantity;
  }

  product.quantity=result;

  movements.unshift({
    id:uid(),
    productId:product.id,
    productName:product.name,
    kitchen:product.kitchen,
    type,
    quantity,
    detail,
    result,
    date:new Date().toISOString()
  });

  product.updatedAt=new Date().toISOString();

  saveData();
  closeModal("movementModal");
  renderAll();
  showToast("Movimiento registrado.");
});

function renderMovements(){
  const tbody=document.getElementById("movementsTable");

  if(!movements.length){
    tbody.innerHTML=`<tr><td colspan="7"><div class="empty-state">Todavía no hay movimientos.</div></td></tr>`;
  }else{
    tbody.innerHTML=movements.map(m=>{
      const date=new Date(m.date);
      const dateText=Number.isNaN(date.getTime())?"—":date.toLocaleString("es-CO");

      return `
      <tr>
        <td>${escapeHTML(dateText)}</td>
        <td><strong>${escapeHTML(m.productName)}</strong></td>
        <td>${escapeHTML(m.kitchen||"—")}</td>
        <td>${pill(m.type==="entrada"?"ENTRADA":"SALIDA",m.type==="entrada"?"cyan":"pink")}</td>
        <td>${formatNumber(m.quantity)}</td>
        <td>${escapeHTML(m.detail||"")}</td>
        <td><strong>${formatNumber(m.result)}</strong></td>
      </tr>`;
    }).join("");
  }

  document.getElementById("movementsFooter").textContent=`${movements.length} movimiento(s)`;
}

/* ========================================
   DASHBOARD
   ======================================== */

function renderDashboard(){
  const total=products.length;
  const units=products.reduce((sum,p)=>sum+Number(p.quantity||0),0);

  const low=products.filter(p=>stockState(p).key==="low"||stockState(p).key==="out").length;
  const expired=products.filter(p=>expiryState(p)?.key==="expired").length;

  document.getElementById("statProducts").textContent=formatNumber(total);
  document.getElementById("statUnits").textContent=formatNumber(units);
  document.getElementById("statLow").textContent=formatNumber(low);
  document.getElementById("statExpired").textContent=formatNumber(expired);

  document.getElementById("countOut").textContent=products.filter(p=>stockState(p).key==="out").length;

  document.getElementById("countLow").textContent=products.filter(p=>stockState(p).key==="low").length;

  document.getElementById("countNormal").textContent=products.filter(p=>stockState(p).key==="normal").length;

  document.getElementById("countOver").textContent=products.filter(p=>stockState(p).key==="over").length;

  const recent=[...products].sort((a,b)=>
    (b.updatedAt||b.createdAt||"").localeCompare(a.updatedAt||a.createdAt||"")
  ).slice(0,5);

  document.getElementById("recentTable").innerHTML=recent.length?recent.map(p=>{
    const stock=stockState(p);
    const expiry=expiryState(p);

    return `
      <tr>
        <td><strong>${escapeHTML(p.name)}</strong></td>
        <td>${escapeHTML(p.kitchen||"—")}</td>
        <td>${formatNumber(p.quantity)}</td>
        <td>${formatNumber(p.min)} / ${formatNumber(p.pr)} / ${formatNumber(p.max)}</td>
        <td>${formatDate(p.expiry)}</td>
        <td>${pill(stock.label,stock.color)}</td>
      </tr>`;
  }).join(""):`<tr><td colspan="6"><div class="empty-state">No hay productos.</div></td></tr>`;

  const alerts=getAllAlerts().slice(0,5);

  document.getElementById("dashboardAlerts").innerHTML=alerts.length?alerts.map(a=>`
    <div class="preview-item ${a.color}">
      <strong>${escapeHTML(a.title)}</strong>
      <small>${escapeHTML(a.text)}</small>
    </div>
  `).join(""):`<div class="empty-state">No hay alertas pendientes.</div>`;
}

/* ========================================
   CENTRO DE ALERTAS
   ======================================== */

function renderAlerts(){
  const alerts=getAllAlerts();

  const expired=products.filter(p=>expiryState(p)?.key==="expired").length;
  const low=products.filter(p=>stockState(p).key==="low"||stockState(p).key==="out").length;
  const over=products.filter(p=>stockState(p).key==="over").length;

  document.getElementById("alertSummary").innerHTML=`
    <div class="alert-summary-card"><strong>${expired}</strong><span>Productos vencidos</span></div>
    <div class="alert-summary-card"><strong>${low}</strong><span>Punto de reorden / agotados</span></div>
    <div class="alert-summary-card"><strong>${over}</strong><span>Sobre el máximo</span></div>
    <div class="alert-summary-card"><strong>${alerts.length}</strong><span>Total de alertas</span></div>
  `;

  document.getElementById("navAlertCount").textContent=alerts.length;

  // Crear filtro agrupador una sola vez, conservando la selección al renderizar.
  const alertsList=document.getElementById("alertsList");
  let filterWrap=document.getElementById("alertsFilterWrap");
  if(!filterWrap){
    filterWrap=document.createElement("div");
    filterWrap.id="alertsFilterWrap";
    filterWrap.className="alerts-filter-wrap";
    filterWrap.innerHTML=`
      <label for="alertsFilter">Filtrar grupo:</label>
      <select id="alertsFilter" class="alerts-filter">
        <option value="all">Todas las alertas</option>
        <option value="low">Agotados / Punto de reorden</option>
        <option value="over">Sobre el máximo</option>
        <option value="expired">Productos vencidos</option>
      </select>`;
    alertsList.parentNode.insertBefore(filterWrap,alertsList);
    document.getElementById("alertsFilter").addEventListener("change",renderAlerts);
  }

  const selected=document.getElementById("alertsFilter")?.value||"all";
  const filtered=alerts.filter(a=>{
    if(selected==="all")return true;
    if(selected==="low")return a.title==="Producto agotado"||a.title==="Punto de reorden";
    if(selected==="over")return a.title==="Sobre el máximo";
    if(selected==="expired")return a.title==="Producto vencido";
    return true;
  });

  alertsList.innerHTML=filtered.length?filtered.map(a=>`
    <div class="alert-item ${a.color}">
      <div class="alert-symbol">!</div>
      <div>
        <strong>${escapeHTML(a.title)} · ${escapeHTML(a.product.name)}</strong>
        <p>${escapeHTML(a.text)}</p>
        <p>Cocina: ${escapeHTML(a.product.kitchen||"Sin asignar")}</p>
      </div>
    </div>
  `).join(""):`<div class="empty-state">${alerts.length?"No hay alertas en este grupo.":"¡Excelente! No hay alertas pendientes."}</div>`;
}


/* ========================================
   EXPORTAR CSV
   ======================================== */

document.getElementById("exportBtn").addEventListener("click",()=>{
  const headers=[
    "Producto","Código","Cocina","Categoría","Presentación",
    "Contenido","Unidad contenido","CD","Mínimo","Reorden",
    "Máximo","Existencia","Vencimiento","Estado","Observaciones"
  ];

  const rows=products.map(p=>[
    p.name,p.code,p.kitchen,p.category,p.unit,p.content,
    p.contentUnit,p.cd,p.min,p.pr,p.max,p.quantity,p.expiry,
    stockState(p).label,p.notes
  ]);

  const csv=[headers,...rows].map(row=>
    row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")
  ).join("\r\n");

  downloadFile(new Blob(["\uFEFF"+csv],{
    type:"text/csv;charset=utf-8"
  }),"inventario_ecci.csv");

  showToast("CSV exportado.");
});

/* ========================================
   COPIA DE SEGURIDAD
   ======================================== */

document.getElementById("backupBtn").addEventListener("click",()=>{
  const backup={
    application:"Inventario ECCI",
    version:3,
    createdAt:new Date().toISOString(),
    products,
    movements
  };

  downloadFile(new Blob([JSON.stringify(backup,null,2)],{
    type:"application/json"
  }),"respaldo_inventario_ecci.json");

  showToast("Respaldo creado.");
});

function downloadFile(blob,filename){
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");

  link.href=url;
  link.download=filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/* ========================================
   IMPORTAR RESPALDO
   ======================================== */

document.getElementById("importInput").addEventListener("change",event=>{
  const file=event.target.files[0];

  if(!file)return;

  if(!file.name.toLowerCase().endsWith(".json")){
    showToast("Selecciona un archivo JSON.");
    event.target.value="";
    return;
  }

  const reader=new FileReader();

  reader.onload=()=>{
    try{
      const backup=JSON.parse(reader.result);

      if(!Array.isArray(backup.products)){
        throw new Error("Formato inválido");
      }

      if(!confirm("¿Importar respaldo? Se reemplazarán los datos actuales.")){
        event.target.value="";
        return;
      }

      products=backup.products.map(normalizeProduct);
      movements=Array.isArray(backup.movements)?backup.movements:[];

      saveData();
      renderAll();

      showToast(`Respaldo importado: ${products.length} productos.`);
    }catch(error){
      console.error(error);
      showToast("El archivo no es un respaldo válido.");
    }

    event.target.value="";
  };

  reader.onerror=()=>{
    showToast("No se pudo leer el archivo.");
    event.target.value="";
  };

  reader.readAsText(file);
});

/* ========================================
   NORMALIZAR DATOS
   ======================================== */

function normalizeProduct(p){
  return {
    ...p,
    id:p.id||uid(),
    name:p.name||"Producto sin nombre",
    code:p.code||"",
    kitchen:p.kitchen||"La Scala",
    category:p.category||"General",
    unit:p.unit||"Unidades",
    content:Number(p.content??1),
    contentUnit:p.contentUnit||"unidades",
    cd:Number(p.cd??0),
    min:Number(p.min??0),
    pr:Number(p.pr??p.min??0),
    max:Number(p.max??1),
    quantity:Number(p.quantity??0),
    expiry:p.expiry||"",
    notes:p.notes||""
  };
}

/* ========================================
   ACTUALIZAR TODO
   ======================================== */

function renderAll(){
  products=products.map(normalizeProduct);

  renderDashboard();
  renderProducts();
  renderMovements();
  renderAlerts();

  saveData();
}

/* ========================================
   INICIO
   ======================================== */

function initializeApp(){
  products=products.map(normalizeProduct);

  addDefaultProducts();

  document.getElementById("todayLabel").textContent=
    new Date().toLocaleDateString("es-CO",{
      weekday:"long",
      year:"numeric",
      month:"long",
      day:"numeric"
    });

  renderAll();
}

initializeApp();