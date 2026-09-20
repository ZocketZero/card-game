import React from 'react';
import { X, BookOpen, Crown, Swords, Shield, Zap, Sparkles } from 'lucide-react';

interface RulebookModalProps {
  onClose: () => void;
}

export const RulebookModal: React.FC<RulebookModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content rulebook-modal">
        <div className="modal-header">
          <div className="modal-title">
            <BookOpen className="title-icon" />
            <span>คู่มือกฎการเล่น The Sovereign’s Duel (ศึกชิงบัลลังก์เดือด)</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="rulebook-scroll-body">
          <section className="rule-section">
            <h3><Crown size={20} /> 1. การเตรียมอาณาจักร (Setup)</h3>
            <ul>
              <li><strong>ราชา (King):</strong> ผู้เล่นวางไพ่ King 1 ใบไว้ตรงหน้า เป็นเป้าหมายที่ศัตรูต้องทำลาย</li>
              <li><strong>เกราะชีวิต (HP):</strong> นำไพ่ 3 ใบจากกองจั่วมาวางซ้อนเหลื่อมไว้ใต้ King</li>
              <li><strong>จั่วเริ่มต้น:</strong> ผู้เล่นทั้งสองคนจั่วการ์ดคนละ 5 ใบเป็นไพ่บนมือ</li>
              <li><strong>แนวหน้ารบ:</strong> พื้นที่ว่างตรงหน้า King วางทหารได้สูงสุดพร้อมกัน 3 ใบ</li>
            </ul>
          </section>

          <section className="rule-section">
            <h3><Swords size={20} /> 2. บทบาทของไพ่ (Card Roles)</h3>
            <div className="role-cards-grid">
              <div className="role-card-box">
                <span className="role-box-title">ไพ่ตัวเลข (2-10)</span>
                <p><strong>"ทหาร"</strong> พลังโจมตี/ป้องกันเท่ากับเลขหน้าไพ่ (ต้องรอ 1 เทิร์นถึงจะสั่งโจมตีได้)</p>
              </div>
              <div className="role-card-box">
                <span className="role-box-title">Jack (J)</span>
                <p><strong>"อัศวินจู่โจม"</strong> พลัง 11 สามารถสั่งโจมตีได้ทันทีในเทิร์นที่วางลงสนาม</p>
              </div>
              <div className="role-card-box">
                <span className="role-box-title">Queen (Q)</span>
                <p><strong>"ที่ปรึกษา"</strong> ทิ้งลงสุสาน เลือกใช้ 1 อย่าง:</p>
                <ul>
                  <li><em>เบิกเสบียง:</em> จั่วไพ่เพิ่ม 2 ใบ</li>
                  <li><em>ชุบชีวิต:</em> ดึงทหาร 1 ใบจากสุสานกลับขึ้นมือ</li>
                  <li><em>เยียวยา:</em> เติมเกราะชีวิตใต้ King 1 ใบ (สูงสุด 3 ใบ)</li>
                </ul>
              </div>
              <div className="role-card-box">
                <span className="role-box-title">Ace (A)</span>
                <p><strong>"อาวุธระดับตำนาน"</strong> ทิ้งลงสุสาน เลือกใช้ 1 อย่าง:</p>
                <ul>
                  <li><em>ทำลาย:</em> ทำลายทหารศัตรู 1 ใบในสนามทันที</li>
                  <li><em>โล่ศักดิ์สิทธิ์:</em> ขัดขวางการโจมตีที่เล็งมาที่ King 1 ครั้ง</li>
                </ul>
              </div>
              <div className="role-card-box highlight">
                <span className="role-box-title">King (K) ในสำรับ</span>
                <p>มีความสามารถของทั้ง <strong>Queen และ Ace</strong> รวมกัน (เลือกได้ทั้ง 5 อย่าง!)</p>
              </div>
            </div>
          </section>

          <section className="rule-section">
            <h3><Sparkles size={20} /> 3. พลังแห่งดอก (Suit Powers)</h3>
            <div className="suit-powers-grid">
              <div className="suit-power-item red">
                <span className="suit-icon-large">❤️ Hearts (โพแดง)</span>
                <span>พลังป้องกัน +2 (เมื่อถูกศัตรูโจมตี)</span>
              </div>
              <div className="suit-power-item black">
                <span className="suit-icon-large">♣️ Clubs (ดอกจิก)</span>
                <span>พลังโจมตี +2 (เมื่อเป็นฝ่ายสั่งโจมตี)</span>
              </div>
              <div className="suit-power-item red">
                <span className="suit-icon-large">♦️ Diamonds (ข้าวหลามตัด)</span>
                <span>หากสังหารศัตรูได้สำเร็จ ให้จั่วไพ่เพิ่ม 1 ใบ</span>
              </div>
              <div className="suit-power-item black">
                <span className="suit-icon-large">♠️ Spades (โพดำ - ลอบสังหาร)</span>
                <span>โจมตีข้ามทหารแนวหน้าไปที่ King ได้โดยตรง (พลังหาร 2 ปัดเศษลง และเมื่อตีเสร็จต้องทิ้งลงสุสานทันที)</span>
              </div>
            </div>
          </section>

          <section className="rule-section">
            <h3><Zap size={20} /> 4. ลำดับการเล่น (Turn Sequence)</h3>
            <ol>
              <li><strong>ระยะจั่ว (Draw Phase):</strong> จั่วไพ่ 1 ใบจากกองจั่วโดยอัตโนมัติเมื่อเริ่มเทิร์น</li>
              <li>
                <strong>ระยะสั่งการ (Action Phase):</strong>
                <ul>
                  <li><strong>Action Points (2 AP):</strong> ใช้ 1 AP ต่อการ <em>วางทหาร (2-10 หรือ J)</em> ลงแนวหน้า หรือ <em>ใช้ความสามารถ (ทิ้ง Q, A, K)</em></li>
                  <li>เมื่อวางแผนเสร็จสิ้น ให้กดปุ่ม <strong>"เข้าสู่ระยะโจมตี"</strong> (หรือกดจบเทิร์นได้หากไม่ต้องการโจมตี)</li>
                </ul>
              </li>
              <li>
                <strong>ระยะโจมตี (Attack Step / Phase):</strong>
                <ul>
                  <li><strong>ข้อห้ามสำคัญ:</strong> เมื่อเข้าสู่ระยะโจมตีแล้ว <em>จะไม่สามารถลงการ์ดทหารหรือใช้สกิลได้อีก</em></li>
                  <li><strong>การสั่งโจมตี:</strong> ทหารที่พร้อมรบ (วางก่อนหน้านี้ หรือ Jack) สามารถสั่งโจมตีทหารศัตรูหรือ King ได้ (คนละ 1 ครั้งต่อเทิร์น ทั้งโจมตีเดี่ยวหรือคอมโบ 2 ใบ) โดย<strong>ไม่เสียแต้ม AP</strong></li>
                </ul>
              </li>
              <li><strong>ระยะสิ้นสุด (End Phase):</strong> กดปุ่มจบเทิร์น เพื่อส่งต่อให้อีกฝ่าย</li>
            </ol>
          </section>

          <section className="rule-section">
            <h3><Shield size={20} /> 5. กฎการตัดสินผลและเงื่อนไขชัยชนะ</h3>
            <ul>
              <li><strong>การปะทะ:</strong> เทียบพลัง (ตัวเลข + โบนัสดอก) ใครน้อยกว่าตายลงสุสาน หากเท่ากันตายทั้งคู่</li>
              <li><strong>การคอมโบ 2 ใบ:</strong> สามารถใช้การ์ด 2 ใบโจมตีพร้อมกันได้โดยรวมพลังเข้าด้วยกัน เมื่อจบการต่อสู้ ใบที่มีพลังน้อยที่สุดจาก 2 ใบจะถูกทำลาย</li>
              <li><strong>การกำบัง:</strong> หากศัตรูมีทหารในแนวหน้า ห้ามโจมตี King ยกเว้นใช้ ♠️ ลอบสังหาร</li>
              <li><strong>การลด HP King:</strong>
                <ul>
                  <li>พลังโจมตี 1-5 (หรือ ♠️ ลอบสังหาร): ดึงเกราะชีวิตใต้ King ออก 1 ใบ</li>
                  <li>พลังโจมตี 6 ขึ้นไป: ดึงเกราะชีวิตใต้ King ออก 2 ใบ (ดาเมจรุนแรง)</li>
                </ul>
              </li>
              <li><strong>🏆 เงื่อนไขชัยชนะ:</strong> เมื่อทำลายเกราะชีวิตใต้ King จนหมด และสามารถโจมตีซ้ำได้อีก 1 ครั้ง จะเป็นผู้ชนะในสงครามทันที!</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
