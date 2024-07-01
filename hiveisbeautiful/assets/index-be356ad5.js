(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const n of s)if(n.type==="childList")for(const l of n.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&o(l)}).observe(document,{childList:!0,subtree:!0});function r(s){const n={};return s.integrity&&(n.integrity=s.integrity),s.referrerPolicy&&(n.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?n.credentials="include":s.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function o(s){if(s.ep)return;s.ep=!0;const n=r(s);fetch(s.href,n)}})();const J={appNames:[],customJsonPrefixes:["archmage_"],hiveEngineSymbols:["ARCHMAGE","ARCHMAGEA","ARCHMAGEB","ARCHMAGEM"],color:"blue",label:"Archmage"},_={appNames:["actifit"],color:"red",customJsonPrefixes:["actifit"],hiveEngineSymbols:["AFIT","AFITX"],label:"Actifit"},E={appNames:["beem","beempy"],color:"gray",label:"beem"},q={appNames:["beerlover"],color:"orange",hiveEngineSymbols:["BEER"],label:"Beer"},C={appNames:[],customJsonPrefixes:["cbm_"],hiveEngineSymbols:[""],color:"lightgreen"},A={appNames:[],color:"gray",customJsonPrefixes:[],hiveEngineSymbols:[""]},I={appNames:["CS"],color:"blue",label:"CS"},j={appNames:[],customJsonPrefixes:["dcrops"],hiveEngineSymbols:[""],color:"lightgreen",label:"dCrops"},T={appNames:["dbuzz"],color:"red",label:"dBuzz"},z={customJsonPrefixes:["dlux_"],label:"DLUX",color:"lightgreen"},L={appNames:[],color:"gray",customJsonPrefixes:[],hiveEngineSymbols:[""],label:"Downvote"},M={appNames:["ecency"],color:"blue",label:"Ecency",customJsonPrefixes:["ecency_","esteem_"],hiveEngineSymbols:[""]},W={appNames:["engage"],color:"blue",label:"Engage"},$={appNames:["engrave"],color:"blue",label:"Engrave"},D={color:"blue",customJsonPrefixes:["exode"],label:"Exode"},H={appNames:["exxp"],color:"blue",label:"Exxp"},R={appNames:[],color:"blue",customJsonPrefixes:["go_"],label:"GolemO"},U={appNames:[],color:"blue",customJsonPrefixes:["gls-"],hiveEngineSymbols:[""],label:"GLS"},B={appNames:[],color:"red",customJsonPrefixes:["ssc-mainnet","scot_"],hiveEngineSymbols:[""],label:"H-E"},F={"app-names":[],color:"lightgreen",customJsonPrefixes:["qwoyn_"],hiveEngineSymbols:["BUDS","BUDSX","EXP"],label:"HashKings"},G={color:"hotpink",customJsonPrefixes:["pp_video"],label:"HiveTube"},Z={"app-names":[],color:"purple","custom-json-ids":[],hiveEngineSymbols:["ZING"],label:"Holo"},X={color:"yellow"},K={appNames:["leothreads","leofinance"],color:"yellow",customJsonPrefixes:["leo_"],label:"INLEO",url:"https://inleo.io"},V={appNames:"la-colmena"},Q={customJsonPrefixes:["lensy_"],label:"Lensy"},Y={appNames:["liketu"],color:"bluegreen",customJsonPrefixes:["react"],label:"liketu",url:"https://www.liketu.com/"},ee={color:"blue",customJsonPrefixes:["mole-miner-"],label:"MuTerra"},oe={color:"orange",customJsonPrefixes:["nftmart"],label:"NFTMart",url:"https://nftm.art"},te={customJsonPrefixes:["nftsr_"],label:"NTFSR"},re={customJsonPrefixes:["op_"],label:"OP"},ne={color:"gray"},se={customJsonPrefixes:["pm_"],label:"PKM",color:"orange"},le={appNames:["peakd"],color:"lightgreen",customJsonPrefixes:["peakd_","beacon_custom_json"],label:"PeakD"},ce={color:"bluegreen",customJsonPrefixes:["pigs_expired/1","reject_order/1","game_request/1","pack_purchase/1","confirm_order/1","fulfill_pigs/1","end_game/1","gmreq_","start_game/1","game_rewards/1","pig_upgrade/1","fulfill_points/1"],label:"Piggies"},ae={appNames:["pizzabot"],color:"yellow",hiveEngineSymbols:["PIZZA"],label:"PIZZA",url:"https://hive.pizza"},ie={appNames:["Poshtoken 0.0.1","Poshtoken 0.0.2"],color:"yellow"},ue={color:"lightgreen"},me={color:"yellow",customJsonPrefixes:["pp_"],label:"podping"},fe={label:"PoB",customJsonPrefixes:["proofofbrain"],color:"gray"},pe={color:"bluegreen",customJsonPrefixes:["duat_"],label:"Ragnarok"},de={appNames:["somee"],color:"red",label:"Somee"},be={appNames:["3speak","3SpeakComment"],color:"bluegreen",customJsonPrefixes:["spkcc_","3speak-"],hiveEngineSymbols:[""],label:"Spk"},ge={appNames:["splinterboost"],color:"green",label:"Splinterboost"},ye={appNames:["steemmonsters","splinterlands"],color:"green",customJsonPrefixes:["sm_","sl-","dev-sm_"],label:"SL"},ve={appNames:["splintertalk"],color:"green",label:"Splintertalk"},he={color:"blue"},Se={color:"orange",customJsonPrefixes:["terracore_","tm_"],label:"Terracore"},ke={color:"gray"},xe={appNames:"travelfeed",color:"orange",label:"Travelfeed"},Ne={appNames:["Discord"],color:"blue",label:"Qurator"},Pe={appNames:["sportstalksocial"],hiveEngineSymbols:["SPORTS"],color:"blue",label:"Sportstalk"},Oe={color:"gray"},we={color:"blue",customJsonPrefixes:"vsc.",label:"VSC"},Je={color:"orange",label:"VIMM"},_e={appNames:["waivio"],color:"gray",customJsonPrefixes:["wobj_","waivio_"],label:"Waivio"},Ee={color:"yellow",customJsonPrefixes:["woo_"],hiveEngineSymbols:["WOO","WOOALPHA","WOOSATURN","WOORAVEN"],label:"WOO"},c={archmage:J,actifit:_,beem:E,beerlover:q,CBM:C,Comment:A,cryptoshots:I,dcrops:j,dbuzz:T,dlux:z,downvote:L,ecency:M,engage:W,enrave:$,exode:D,exxp:H,golemoverlord:R,gls:U,hiveengine:B,hashkings:F,"Hive.blog":{appNames:["hiveblog"],color:"yellow-orange",label:"hive.blog"},hivetube:G,holozing:Z,Holybread:X,inleo:K,lacolmena:V,lensy:Q,liketu:Y,muterra:ee,nftmart:oe,nftshowroom:te,oceanplanet:re,Other:ne,peakmonsters:se,peakd:le,piggericks:ce,PIZZA:ae,Posh:ie,Post:ue,podping:me,proofofbrain:fe,ragnarok:pe,somee:de,spk:be,splinterboost:ge,splinterlands:ye,splintertalk:ve,STEMSocial:he,terracore:Se,Xfer:ke,travelfeed:xe,qurator:Ne,sportstalksocial:Pe,Up:Oe,vsc:we,vimm:Je,waivio:_e,WOO:Ee},f=800,p=600;function k(e,t,r){return e<=t?t:e>=r?r:e}const qe=()=>Math.random()<.5?-1:1,i=e=>e*qe()*Math.random();function Ce(e){var t=d3.select("svg#viz").selectAll("g").data(e);t.enter().append("g").attr("pointer-events","all").attr("class","node").each(function(r){d3.select(this).append("circle").attr("class",function(o){return`${o.color} stroke`}).attr("r",function(o){return k(o.label.length*6.25,20,40)}).attr("pointer-events","all").on("mouseover",o=>console.warn(o)),d3.select(this).append("text").attr("dominant-baseline","central").attr("text-anchor","middle").text(function(o){return o.label}).style("font-size","17px").attr("pointer-events","all").on("mouseover",o=>console.warn(o))}).attr("pointer-events","all").on("mouseover",r=>console.warn(r)),t.exit().remove()}function Ae(){var e=d3.select("svg#viz").selectAll("g");e.attr("transform",function(t){return"translate("+t.x+","+t.y+")"})}function Ie(e){const t=b(e);var r=g(e),o;return t?o=u(t):o=u(r),[{label:r,color:o,x:f/2+i(100),y:p/2+i(100)}]}function je(e){var t=[],r=e[1].json;try{r=JSON.parse(r)}catch(o){return console.warn("Invalid JSON:",o),[]}if(!r)return t;if(Array.isArray(r))for(const o of r){const s=N(o.contractPayload.symbol);if(!s)continue;const n=P(s),l=u(s);t.push({label:n,color:l,x:f/2+i(100),y:p/2+i(100)})}else if(r.contractPayload){const o=r.contractPayload.symbol,s=N(o);if(!s)return t;const n=P(s),l=u(s);console.debug(s,n,l),t.push({label:n,color:l,x:f/2+i(100),y:p/2+i(100)})}return t}function Te(e){if(document.querySelector("#flexCheckCustomJSONs").value)return[];var t=[],r=e[1].id;r.startsWith("ssc-mainnet")&&(t=t.concat(je(e)));const o=b(e);var s=g(e);s||console.error("missing label for:",o);var n;return o?n=u(o):n=u(s),t.push({label:s,color:n,x:f/2+i(100),y:p/2+i(100)}),t}function ze(e){const t=b(e);var r=g(e),o;return t?o=u(t):o=u(r),[{label:r,color:o,x:f/2+i(100),y:p/2+i(100)}]}function Le(e){var t=[];return e.forEach(r=>{r.operations.forEach(o=>{const s=o[0];var n=[];s==="comment"?n=Ie(o):s==="custom_json"?n=Te(o):n=ze(o),t=t.concat(n)})}),t}function N(e){for(const[t,r]of Object.entries(c))if(r.hiveEngineSymbols&&r.hiveEngineSymbols.includes(e))return console.debug("from HE symbol appId",t),t}function b(e){const t=e[0];var r=e[1].json_metadata;if(r)var r=JSON.parse(r);if(r&&r.app){var o=r.app;typeof o=="string"?(o=o.split("/")[0],o=o.split("-mobile-")[0]):o.name&&(o=o.name)}if(o&&console.debug("JSON app name",o),o){for(const[n,l]of Object.entries(c))if(l.appNames){for(const a of l.appNames)if(a.startsWith(o.toLowerCase()))return console.debug("appId",n),n}console.warn("Did not find app in registry: ",o)}if(t=="custom_json"){var s=e[1].id;for(const[n,l]of Object.entries(c))if(l.customJsonPrefixes){for(const a of l.customJsonPrefixes)if(s.startsWith(a))return console.debug("appId",n),n}}return null}function g(e){var t=e[0];if(t=="comment"){const l=b(e);return l&&!Object.keys(c[l]).includes("label")&&console.log(l,"missing label"),l&&c[l].label?c[l].label:t.charAt(0).toUpperCase()+t.slice(1)}else if(t=="custom_json"){var r=e[1].id,o=e[1].json,s=o.app;if(typeof s=="object"&&Object.keys(s).includes("name")&&(s=s.name),s){for(const l of Object.values(c))if(l.appNames){for(const a of l.appNames)if(a.startsWith(s))return console.debug("Labeled by app name:",l.label),l.label}}for(const l of Object.values(c))if(l.customJsonPrefixes){for(const a of l.customJsonPrefixes)if(r.startsWith(a))return l.label}return r=="notify"?"Notify":r=="follow"?"Follow":r=="reblog"?"Reblog":r=="community"?"Community":r==="rc"?"RC":(console.warn("Unrecognized CustomJSON id:",r),"Other")}else{if(t=="vote")return e[1].weight>0?"Up":"Down";if(t=="transfer")return"Xfer";if(t.startsWith("limit"))return"Market";var n=e[0].split("_")[0];return n=n.charAt(0).toUpperCase()+n.slice(1),n=n.substring(0,9),n}}function P(e){return Object.keys(c).includes(e)&&c[e].label?c[e].label:(console.warn("Label not found for: ",e),"Other")}function u(e){return Object.keys(c).includes(e)&&c[e].color?c[e].color:"gray"}function w(){var e=prompt("Enter block number:",document.querySelector("#blockNum").innerText);e=parseInt(e)-1,!e||e<0?h():(document.querySelector("#blockNum").data=`${e+1}`,document.querySelector("#blockNum").innerText=`${e}`),y()}document.querySelector("button#gotoblock").onclick=e=>{w()};function x(e){document.querySelector("button#play").hidden?(document.querySelector("button#pause").hidden=!0,document.querySelector("button#play").hidden=!1):(document.querySelector("button#play").hidden=!0,document.querySelector("button#pause").hidden=!1)}document.querySelector("button#pause").onclick=e=>{x()};document.querySelector("button#play").onclick=e=>{x()};function Me(){document.querySelector("#flexCheckCustomJSONs").value?document.querySelector("#flexCheckCustomJSONs").value=!1:document.querySelector("#flexCheckCustomJSONs").value=!0}document.querySelector("#flexCheckCustomJSONs").onclick=e=>{Me()};function d(e){const s=v();if(e)var n=s+1;else var n=s-1;n=k(n,1,10),document.querySelector("#speedgauge").data=`${n}`,document.querySelector("#speedgauge").innerText=`${n}x`}document.querySelector("button#fastforward").onclick=e=>{d(!0)};document.querySelector("button#backward").onclick=e=>{d(!1)};function v(){document.querySelector("#speedgauge").data||(document.querySelector("#speedgauge").data="1.0");var e=parseFloat(document.querySelector("#speedgauge").data);return e}hive.api.setOptions({url:"https://api.deathwing.me/"});function h(){hive.api.getDynamicGlobalProperties(function(e,t){if(e){console.error(e);return}var r=t.current_witness;document.querySelector("#currentWitness").innerText=`${r}`;var o=t.head_block_number;document.querySelector("#blockNum").innerText=`${o}`,document.querySelector("#blockNum").data=`${o}`,y()})}function y(){var e=document.querySelector("#blockNum").data;if(!e){console.debug("Failed to find block");return}hive.api.getBlock(e,function(t,r){if(t){console.error(t);return}var o=r;if(!o||!o.transactions)return;const s=o.transactions.length;document.querySelector("#blockSize").innerText=`${s.toLocaleString()} transactions`,d3.select("svg#viz").selectAll("g").remove(),d3.select("svg#viz").attr("pointer-events","all"),d3.select("svg#viz").on("click",l=>console.error(l));var n=Le(o.transactions);Ce(n),d3.selectAll("g").on("click",l=>console.error(l)),d3.selectAll("g").select("text").on("click",l=>console.error(l)),d3.selectAll("circle").attr("pointer-events","all"),d3.selectAll("g").select("circle").on("click",l=>console.error(l)),d3.forceSimulation(n).force("center",d3.forceCenter(f/2,p/2)).force("collision",d3.forceCollide().radius(function(l){return k(l.label.length*6.25,20,40)})).on("tick",Ae).alpha(10),o.transactions.forEach(l=>{l.operations.forEach(a=>{a[0]==="custom_json"&&g(a)=="Other"&&console.warn("Unknown app",JSON.stringify(a))})}),document.querySelector("#blockNum").data==`${parseInt(e)}`&&(document.querySelector("#blockNum").data=`${parseInt(e)+1}`,document.querySelector("#blockNum").innerText=`${e}`,document.querySelector("#currentWitness").innerText=`${o.witness}`,document.querySelector("#timestamp").innerText=`${o.timestamp}`)}),console.info("Parsed block number:",e)}var O=new URLSearchParams(window.location.search);if(O.has("block")){var m=O.get("block"),m=parseInt(m);isNaN(m)||m<0?h():(document.querySelector("#blockNum").innerText=`${m}`,document.querySelector("#blockNum").data=`${m}`,y())}else h();function S(){document.querySelector("button#pause").hidden!=!0&&v()!=0&&y();var e=Math.abs(3e3/v());e!=1/0?setTimeout(()=>{S()},e):setTimeout(()=>{S()},1e3)}S();document.onkeydown=We;function We(e){e=e||window.event,e.keyCode=="38"||e.keyCode=="40"||(e.keyCode=="37"?d(!1):e.keyCode=="39"?d(!0):e.keyCode=="32"?x():e.keyCode=="83"&&w())}window.addEventListener("keydown",function(e){e.keyCode==32&&e.target==document.body&&e.preventDefault()});
