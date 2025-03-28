import React from 'react';
import styles from './RulesModal.module.css';

interface RulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>×</button>
                <h2>How to Play</h2>
                <ol>
                    <li><strong>Choose a Shape:</strong> In each round, buy at least one play and use it to play the shape(s) of your choice: triangle, circle, or square. You can play as many as you want of each shape.</li>
                    <li><strong>Beat the Timer:</strong> Play your shape(s) before the clock runs out! Unused plays do not carry over to the next round.</li>
                    <li><strong>Avoid the Majority:</strong> At the end of each round, the shape played the most times gets eliminated.</li>
                    <li><strong>Win Together:</strong> The game ends when everyone plays the same shape, or when the last two shapes get the exact same number of plays. Everyone who survives shares the prize. Your share is based on how many of the winning shape you played in the final round.</li>
                    <li><strong>Shape Hierarchy:</strong> If there's a tie for the shape played the most times, circles always lose, and triangles beat squares.</li>
                </ol>
                <button className={styles.gotItButton} onClick={() => {
                    localStorage.setItem('userGotRules', 'true')
                    onClose()
                }}>Got it!</button>
            </div>
        </div>
    );
};

export default RulesModal; 