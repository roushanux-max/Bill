import{c as o,b as c,am as d,j as e,B as l,an as m}from"./index-CbKaY80g.js";/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],u=o("chevron-left",x);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]],g=o("circle-alert",f);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],p=o("refresh-cw",h);function w({type:a="404",title:s,message:n}){const i=c(),r=d(),t={404:{image:"/assets/404.png",title:s||"Page Went Missing",message:n||"We searched everywhere but couldn't find the page you're looking for. It might have been moved or deleted.",buttonText:"Back to Home",action:()=>i("/")},maintenance:{image:"/assets/maintenance.png",title:s||"Updating the Engine",message:n||"We're currently pushing some new code to make your experience even better. We'll be back online in a few minutes.",buttonText:"Try Again",action:()=>window.location.reload()},offline:{image:"/assets/offline.png",title:s||"Waiting for Signal",message:n||"It looks like your device is offline. Please check your internet connection and try again.",buttonText:"Reconnect",action:()=>window.location.reload()},error:{image:"/assets/404.png",title:s||"Something Tripped",message:n||"An unexpected error occurred while processing your request. Our team has been notified.",buttonText:"Go Back",action:()=>i(-1)}}[a];return e.jsxs("div",{className:"min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center",children:[e.jsxs("div",{className:"max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500",children:[e.jsxs("div",{className:"relative group",children:[e.jsx("div",{className:"absolute -inset-4 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors duration-500"}),e.jsx("img",{src:t.image,alt:t.title,className:"w-full h-auto max-w-[320px] mx-auto relative drop-shadow-2xl animate-float"})]}),e.jsxs("div",{className:"space-y-3 relative",children:[e.jsx("h1",{className:"text-3xl font-extrabold text-slate-900 tracking-tight",children:t.title}),e.jsx("p",{className:"text-slate-500 text-lg leading-relaxed max-w-[320px] mx-auto",children:t.message})]}),e.jsxs("div",{className:"flex flex-col sm:flex-row gap-3 justify-center pt-4",children:[e.jsxs(l,{onClick:t.action,size:"lg",className:"bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-8 h-12 shadow-lg shadow-indigo-200 transition-all active:scale-95",children:[a==="404"?e.jsx(m,{className:"w-4 h-4 mr-2"}):e.jsx(p,{className:"w-4 h-4 mr-2"}),t.buttonText]}),a!=="404"&&e.jsxs(l,{variant:"outline",onClick:()=>i("/"),size:"lg",className:"border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl px-8 h-12 transition-all active:scale-95",children:[e.jsx(u,{className:"w-4 h-4 mr-2"}),"Home"]})]}),a==="404"&&e.jsxs("div",{className:"pt-8 opacity-50 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium bg-slate-100/50 py-2 px-4 rounded-full w-fit mx-auto",children:[e.jsx(g,{className:"w-3 h-3"}),"Path: ",r.pathname]})]}),e.jsxs("div",{className:"fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden",children:[e.jsx("div",{className:"absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-[120px] animate-pulse"}),e.jsx("div",{className:"absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-[120px] animate-pulse-slow"})]}),e.jsx("style",{dangerouslySetInnerHTML:{__html:`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 10s ease-in-out infinite;
        }
      `}})]})}export{w as default};
