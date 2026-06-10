import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { QrCode, Package, CheckCircle2, Clock, ShieldAlert, Key } from 'lucide-react';
import { GroupBuy, GroupBuyRegistration } from '../types';
import { getPickupPin } from '../utils/pin';

interface GroupBuyReceiptProps {
  groupBuy: GroupBuy;
  registration: GroupBuyRegistration;
  userId: string;
}

export const GroupBuyReceipt: React.FC<GroupBuyReceiptProps> = ({ groupBuy, registration, userId }) => {
  const isPickedUp = registration.pickupStatus === 'picked_up';
  const isPaid = registration.paymentStatus === 'paid';

  // Construct QR content
  const qrData = JSON.stringify({
    groupBuyId: groupBuy.id,
    userId: userId,
    type: 'group_buy_pickup'
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden bg-black/60 border border-white/10 rounded-2xl p-5 font-mono text-xs space-y-4 shadow-xl"
    >
      {/* Decorative top dot-matrix border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-green via-transparent to-cyber-green opacity-40" />

      {/* Header Info */}
      <div className="flex items-start justify-between border-b border-white/5 pb-3">
        <div className="space-y-1">
          <span className="text-[10px] tracking-widest text-white/40 uppercase">智能團購憑證 / PICKUP VOUCHER</span>
          <h4 className="text-sm font-bold text-white tracking-tight">{groupBuy.title}</h4>
        </div>
        <div className="shrink-0">
          {isPickedUp ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyber-green border border-cyber-green/30 bg-cyber-green/10 px-2 py-0.5 rounded select-none">
              <CheckCircle2 size={10} className="stroke-[3]" />
              ✅ 已提取
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded select-none animate-pulse">
              <Clock size={10} />
              ⏳ 未提取
            </span>
          )}
        </div>
      </div>

      {/* Ticket Details Container */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Ticket fields */}
        <div className="sm:col-span-7 space-y-2.5">
          <div className="grid grid-cols-2 gap-2 text-[10px] border-b border-white/5 pb-2">
            <div>
              <span className="text-white/40 block uppercase">認購數量 / QTY</span>
              <span className="text-white font-bold text-sm">{registration.qty} 套</span>
            </div>
            <div>
              <span className="text-white/40 block uppercase">特惠單價 / UNIT PRICE</span>
              <span className="text-cyber-green font-bold text-sm">HKD ${groupBuy.price}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] border-b border-white/5 pb-2">
            <div>
              <span className="text-white/40 block uppercase">總計金額 / TOTAL</span>
              <span className="text-white font-black text-sm text-cyber-green">HKD ${registration.qty * groupBuy.price}</span>
            </div>
            <div>
              <span className="text-white/40 block uppercase">入數狀態 / PAYMENT</span>
              <span>
                {isPaid ? (
                  <span className="text-cyber-green font-bold">已核實 (PAID)</span>
                ) : (
                  <span className="text-amber-400 font-bold">待確認 (PENDING)</span>
                )}
              </span>
            </div>
          </div>

          <div className="text-[9px] text-white/30 space-y-1">
            <p>📋 憑證使用說明：</p>
            <p>請於線下車聚交收時，向現場管理員出示此 QR Code，以便管理團隊進行掃描並簽收銷帳。</p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-white hover:bg-zinc-50 rounded-xl transition-colors border border-white/10 group h-full">
          <div className="relative">
            <QRCodeSVG
              value={qrData}
              size={110}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: "/icon.png",
                x: undefined,
                y: undefined,
                height: 18,
                width: 18,
                excavate: true,
              }}
            />
            {isPickedUp && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-cyber-green rounded-lg border border-cyber-green/50 backdrop-blur-[1px]">
                <CheckCircle2 size={32} className="stroke-[3]" />
                <span className="text-[10px] font-bold uppercase mt-1">已完結 / CLOSED</span>
              </div>
            )}
          </div>
          <span className="text-[8px] text-black/50 font-bold tracking-wider mt-1.5 uppercase font-mono">
            SECURE CHECKOUT QR
          </span>

          {/* 4位數提貨驗證碼 / PIN CODE */}
          {!isPickedUp && (
            <div className="mt-2.5 px-3 py-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-lg text-[10px] font-bold font-mono tracking-wider flex items-center justify-center gap-1.5 select-all text-black w-full shadow-sm transition-colors" title="提貨驗證碼：提貨時若QR碼掃描失敗，請告知管理員此4位數密碼">
              <Key size={10} className="text-zinc-500 stroke-[2.5]" />
              <span className="text-zinc-600">提貨驗證碼：</span>
              <span className="text-black font-black text-sm tracking-widest">{registration.pickupPin || getPickupPin(groupBuy.id, userId)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Separator / Perforations */}
      <div className="relative flex items-center py-1">
        <div className="absolute -left-6 w-3 h-3 bg-cyber-bg border-r border-white/10 rounded-full" />
        <div className="w-full border-t border-dashed border-white/20" />
        <div className="absolute -right-6 w-3 h-3 bg-cyber-bg border-l border-white/10 rounded-full" />
      </div>

      {/* Bottom info */}
      <div className="flex items-center gap-2 text-[9px] text-white/25">
        <Package size={12} className="stroke-[1.5]" />
        <span>憑證號：{groupBuy.id.slice(0, 8).toUpperCase()}-{userId.slice(0, 6).toUpperCase()}</span>
      </div>
    </motion.div>
  );
};
