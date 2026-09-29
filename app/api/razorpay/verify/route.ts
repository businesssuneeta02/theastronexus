import {NextResponse} from 'next/server';
import crypto from 'crypto';
import {createClient} from '@supabase/supabase-js';
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
export async function POST(req:Request){
 try{
  if(!process.env.RAZORPAY_KEY_SECRET||!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({error:'Payment gateway is not configured.'},{status:503});
  const {razorpay_order_id,razorpay_payment_id,razorpay_signature}=await req.json();
  const expected=crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET).update(razorpay_order_id+'|'+razorpay_payment_id).digest('hex');
  if(String(expected)!==String(razorpay_signature)) return NextResponse.json({error:'Payment verification failed.'},{status:400});
  const {error}=await db.from('payments').update({payment_id:razorpay_payment_id,signature:razorpay_signature,status:'paid',paid_at:new Date().toISOString()}).eq('order_id',razorpay_order_id);
  if(error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ok:true});
 }catch(e:any){return NextResponse.json({error:e?.message||'Unable to verify payment.'},{status:500})}
}