import React from 'react';
import { X, ScrollText } from 'lucide-react';

interface CombatLogModalProps {
  logs: string[];
  onClose: () => void;
}

export const CombatLogModal: React.FC<CombatLogModalProps> = ({ logs, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content combat-log-modal">
        <div className="modal-header">
          <div className="modal-title">
            <ScrollText className="title-icon" />
            <span>บันทึกการสู้รบ (Combat History)</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="combat-log-list">
          {logs.map((log, index) => (
            <div key={`log-${index}`} className="combat-log-row">
              <span className="log-index">#{logs.length - index}</span>
              <span className="log-text">{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
