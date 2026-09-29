'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';
declare global {interface Window{Razorpay:any}}
export default function PayPage(){
 const [productId,setProductId]=useState<string|null>(null),[productType,setProductType]=useState<'course'|'service'>('service');
 const [item,setItem]=useState<any>(null),[form,setForm]=useState({name:'',email:'',phone:''}),[msg,setMsg]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{const p=new URLSearchParams(window.location.search);setProductId(p.get('id'));setProductType(p.get('type')==='course'?'course':'service')},[]);
 useEffect(()=>{if(!productId)return;const table=productType==='course'?'courses':'services';supabase.from(table).select('*').eq('id',productId).single().then(({data,error})=>{if(error)setMsg('Unable to load this item.');else setItem(data)})},[productId,productType]);
 useEffect(()=>{const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.async=true;document.body.appendChild(s);return()=>{document.body.removeChild(s)}},[]);
 async function pay(e:any){e.preventDefault();setLoading(true);setMsg('');try{
  const r=await fetch('/api/razorpay/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productType,productId,name:form.name,email:form.email,phone:form.phone})});
  const order=await r.json();if(!r.ok)throw new Error(order.error);
  if(!window.Razorpay)throw new Error('Payment checkout is still loading. Please try again.');
  const rz=new window.Razorpay({key:order.keyId,amount:order.amount,currency:order.currency,name:'TheAstroNexus',description:order.productName,order_id:order.orderId,prefill:{name:form.name,email:form.email,contact:form.phone},theme:{color:'#6b4f9f'},handler:async(response:any)=>{
   const vr=await fetch('/api/razorpay/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(response)});
   const v=await vr.json();setMsg(v.ok?'Payment successful. Your booking request has been recorded.':'Payment verification failed. Please contact us.');
  },modal:{ondismiss:()=>setMsg('Payment window closed. You can try again.')}});
  rz.open();
 }catch(err:any){setMsg(err.message||'Payment could not be started.')}finally{setLoading(false)}}
 if(!productId)return <main className="adminShell"><div className="adminLogin"><h1>Payment</h1><p>Please select a service or course first.</p><a className="button" href="/">Back to website</a></div></main>;
 return <main className="payPage"><div className="payCard"><div className="eyebrow">SECURE ONLINE PAYMENT</div><h1>{item?.name||'Loading…'}</h1>{item&&<h2>₹{Number(item.price_inr).toLocaleString('en-IN')}</h2>}<p>Enter your details and continue to secure checkout.</p><form onSubmit={pay}><input required placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input placeholder="Phone / WhatsApp" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><button className="button wide" disabled={loading||!item}>{loading?'Starting payment…':'Pay ₹'+(item?Number(item.price_inr).toLocaleString('en-IN'):'—')}</button></form>{msg&&<p className="payMsg">{msg}</p>}<a className="back" href="/">← Back to TheAstroNexus</a></div></main>
}