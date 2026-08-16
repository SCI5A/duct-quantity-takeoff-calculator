let items=JSON.parse(localStorage.getItem("ductItemsV3")||"[]");
const $=id=>document.getElementById(id), n=id=>Number($(id).value)||0;
function settings(){return{waste:n("waste"),adhRate:n("adhRate"),tapeRate:n("tapeRate"),cleatSpacing:n("cleatSpacing"),silCoverage:n("silCoverage"),insWaste:n("insWaste")}}
function addItem(){
 const type=$("type").value,w=n("w"),h=n("h"),d=n("d"),l=n("l"),qty=Math.max(1,n("qty")),th=n("th"),insTh=n("insTh"),mj=n("joints"),s=settings();
 if(l<=0||(type==="rect"&&(w<=0||h<=0))||(type==="round"&&d<=0)){alert("أدخل الأبعاد والطول بشكل صحيح.");return}
 const p=type==="rect"?2*((w+h)/1000):Math.PI*d/1000, area=p*l*qty, waste=area*s.waste/100, total=area+waste, ins=area*(1+s.insWaste/100), joints=mj>0?mj:Math.max(0,qty-1), flange=p*joints*2, corners=type==="rect"?8*joints:0, jointP=p*joints*2, cleats=s.cleatSpacing>0?Math.ceil(jointP/(s.cleatSpacing/1000)):0, gasket=jointP, silicone=s.silCoverage>0?Math.ceil(jointP/s.silCoverage):0, bolts=cleats, weight=total*(th/1000)*7850, tape=ins*s.tapeRate, adhesive=ins*s.adhRate;
 items.push({type,w,h,d,l,qty,th,insTh,joints,area,waste,total,ins,flange,corners,cleats,gasket,silicone,bolts,weight,tape,adhesive});save();render();clearForm()
}
function clearForm(){["w","h","d","l"].forEach(x=>$(x).value="");$("qty").value=1;$("joints").value=0}
function removeItem(i){items.splice(i,1);save();render()}
function clearAll(){if(confirm("حذف جميع البنود؟")){items=[];save();render()}}
function save(){localStorage.setItem("ductItemsV3",JSON.stringify(items))}
function render(){
 const r=$("rows");r.innerHTML="";
 items.forEach((x,i)=>{let size=x.type==="rect"?`${x.w} × ${x.h} mm`:`Ø ${x.d} mm`;r.insertAdjacentHTML("beforeend",`<tr><td>${i+1}</td><td>${x.type==="rect"?"مستطيل":"دائري"}</td><td>${size}</td><td>${x.l.toFixed(2)}</td><td>${x.qty}</td><td>${x.total.toFixed(2)}</td><td>${x.ins.toFixed(2)}</td><td>${x.adhesive.toFixed(2)}</td><td>${x.flange.toFixed(2)}</td><td>${x.corners}</td><td>${x.cleats}</td><td>${x.gasket.toFixed(2)}</td><td>${x.silicone}</td><td>${x.bolts}</td><td>${x.weight.toFixed(2)}</td><td><button onclick="removeItem(${i})">حذف</button></td></tr>`)});
 const sum=k=>items.reduce((a,x)=>a+x[k],0), vals=[
 ["البنود",items.length,""],["طول الدكت",items.reduce((a,x)=>a+x.l*x.qty,0).toFixed(2),"m"],["مساحة الصاج",sum("area").toFixed(2),"m²"],["الهالك",sum("waste").toFixed(2),"m²"],["الإجمالي",sum("total").toFixed(2),"m²"],["العزل",sum("ins").toFixed(2),"m²"],["غراء العزل",sum("adhesive").toFixed(2),"kg"],["شريط العزل",sum("tape").toFixed(2),"m"],["G-Flange",sum("flange").toFixed(2),"m"],["Corners",sum("corners"),"pcs"],["Cleats",sum("cleats"),"pcs"],["Gasket",sum("gasket").toFixed(2),"m"],["Silicone",sum("silicone"),"tubes"],["Bolts/Nuts",sum("bolts"),"sets"],["وزن الصاج",sum("weight").toFixed(2),"kg"]];
 $("summary").innerHTML=vals.map(v=>`<div class="metric"><small>${v[0]}</small><strong>${v[1]} ${v[2]}</strong></div>`).join("")
}
function exportCSV(){
 let lines=[["#","Type","Size","Length m","Qty","Duct m2","Insulation m2","Adhesive kg","G-Flange m","Corners","Cleats","Gasket m","Silicone tubes","Bolts","Weight kg"]];
 items.forEach((x,i)=>lines.push([i+1,x.type==="rect"?"Rectangular":"Round",x.type==="rect"?`${x.w}x${x.h} mm`:`Ø${x.d} mm`,x.l,x.qty,x.total,x.ins,x.adhesive,x.flange,x.corners,x.cleats,x.gasket,x.silicone,x.bolts,x.weight]));
 const csv="\ufeff"+lines.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="duct-quantity-BOQ.csv";a.click()
}render();