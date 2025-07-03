// frontend/src/components/KlishaModal.js

import React, { useState, useCallback } from 'react';
import './KlishaModal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCopy, faPaperPlane, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

/**
 * KlishaModal Component
 * Displays the generated Klisha message in a modal, allowing copying and publishing.
 *
 * @param {string} message - The Klisha message to display.
 * @param {function} onClose - Function to call when the modal is closed.
 * @param {function} onPublishAndClose - Function to call when the message is published and modal closes.
 * @param {string} buttonText - Text for the primary action button.
 */
function KlishaModal({ message, onClose, onPublishAndClose, buttonText = "تأكيد النشر والعودة" }) { 
    const [copyStatus, setCopyStatus] = useState(''); // State to show copy status message

    /**
     * Handles copying the Klisha message to the clipboard.
     * Uses document.execCommand('copy') for broader compatibility within iframes.
     */
    const handleCopy = useCallback(() => {
        const textarea = document.createElement('textarea');
        textarea.value = message;
        document.body.appendChild(textarea);
        textarea.select(); // Select the text
        try {
            document.execCommand('copy'); // Execute copy command
            setCopyStatus('تم النسخ بنجاح!'); // Set success message
        } catch (err) {
            setCopyStatus('فشل النسخ. يرجى النسخ يدوياً.'); // Set error message
            console.error('Failed to copy text: ', err);
        }
        document.body.removeChild(textarea); // Remove temporary textarea

        // Clear copy status message after 2 seconds
        setTimeout(() => {
            setCopyStatus('');
        }, 2000);
    }, [message]); // Re-run if message changes

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    {/* Modal Title with an icon */}
                    <h2 className="heading">
                        <FontAwesomeIcon icon={faCheckCircle} className="icon-heading" />
                        رسالة الجروب النهائية
                    </h2>
                    {/* Close button for the modal */}
                    <button className="modal-close-button" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="modal-body">
                    {/* Textarea to display the Klisha message */}
                    <textarea 
                        className="textarea" 
                        value={message} 
                        readOnly // Make it read-only as it's a display of generated text
                        rows="10" // Default number of rows for better visibility
                    ></textarea>
                    {/* Display copy status message if available */}
                    {copyStatus && <p className="copy-status-message">{copyStatus}</p>}
                </div>
                <div className="modal-footer">
                    {/* Button to copy the Klisha message */}
                    <button className="btn btn-primary" onClick={handleCopy}>
                        <FontAwesomeIcon icon={faCopy} /> نسخ الكليشة
                    </button>
                    {/* Button to confirm publishing and close the modal */}
                    <button className="btn btn-success" onClick={onPublishAndClose}>
                        <FontAwesomeIcon icon={faPaperPlane} /> {buttonText} 
                    </button>
                    {/* Button to simply close the modal */}
                    <button className="btn btn-secondary" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} /> إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
}

export default KlishaModal;