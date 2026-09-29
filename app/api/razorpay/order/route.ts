import {NextResponse} from 'next/server';
import Razorpay from 'razorpay';
import {createClient} from '@supabase/supabase-js';
export async function POST(req:Request){
 try{
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY||!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET) return NextResponse.json({error:'Payment gateway is not configured yet.'},{status:503});
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
  const {productType='service',productId,name,email,phone}=await req.json();
  if(!productId||!name) return NextResponse.json({error:'Product and customer name are required.'},{status:400});
  const table=productType==='course'?'courses':'services';
  const {data:item,error}=await db.from(table).select('id,name,price_inr,is_active').eq('id',productId).single();
  if(error||!item||item.is_active===false) return NextResponse.json({error:'Selected item is unavailable.'},{status:404});
  const amount=Math.round(Number(item.price_inr)*100);
  if(!amount) return NextResponse.json({error:'This item does not have a valid price.'},{status:400});
  const razorpay=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
  const order=await razorpay.orders.create({amount,currency:'INR',receipt:'astro_'+Date.now(),notes:{product_id:productId,product_type:productType}});
  await db.from('payments').insert({order_id:order.id,customer_name:name,customer_email:email||null,customer_phone:phone||null,product_type:productType,product_id:productId,product_name:item.name,amount_inr:Number(item.price_inr),status:'created'});
  return NextResponse.json({orderId:order.id,amount,currency:'INR',keyId:process.env.RAZORPAY_KEY_ID,productName:item.name});
 }catch(e:any){return NextResponse.json({error:e?.message||'Unable to create payment order.'},{status:500})}
}