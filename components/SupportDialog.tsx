import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AdminService } from '../services/AdminService';
import { toast } from 'sonner';

interface SupportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    adminService?: AdminService;
}

export const SupportDialog: React.FC<SupportDialogProps> = ({ isOpen, onClose, adminService }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('5511999999999');
    const [initialMessage, setInitialMessage] = useState('');

    useEffect(() => {
        if (isOpen && adminService) {
            adminService.getSystemSettings()
                .then(settings => {
                    const wa = settings.find(s => s.key === 'support_whatsapp')?.value;
                    const msg = settings.find(s => s.key === 'support_message')?.value;
                    if (wa) setWhatsappNumber(wa);
                    if (msg) setInitialMessage(msg);
                })
                .catch(err => console.error("Failed to fetch support settings", err));
        }
    }, [isOpen, adminService]);

    const handleWhatsApp = () => {
        const encodedMessage = encodeURIComponent(initialMessage);
        window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
        onClose();
    };

    const handleSubmitForm = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success(`Solicitação enviada! Assunto: ${subject}`);
        setIsFormOpen(false);
        onClose();
        setSubject('');
        setMessage('');
    };

    useEffect(() => {
        if (!isOpen) {
            setIsFormOpen(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isFormOpen ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'}`}>
                            <i className={`fas ${isFormOpen ? 'fa-ticket-alt' : 'fa-headset'}`}></i>
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white">
                            {isFormOpen ? 'Abrir Chamado' : 'Suporte Técnico'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="p-6">
                    {!isFormOpen ? (
                        <div className="space-y-3">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center">Como você prefere falar com a gente?</p>
                            {/* WhatsApp Option */}
                            <button
                                onClick={handleWhatsApp}
                                className="w-full flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <i className="fab fa-whatsapp text-2xl"></i>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">WhatsApp</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">Conversa rápida e direta</div>
                                </div>
                                <i className="fas fa-chevron-right ml-auto text-slate-300 group-hover:text-green-500"></i>
                            </button>

                            {/* Form Option */}
                            <button
                                onClick={() => setIsFormOpen(true)}
                                className="w-full flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <i className="fas fa-ticket-alt text-xl"></i>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Abrir Ticket</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">Solicitação formal via sistema</div>
                                </div>
                                <i className="fas fa-chevron-right ml-auto text-slate-300 group-hover:text-indigo-500"></i>
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitForm} className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assunto</label>
                                <select
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    <option value="" disabled>Selecione um assunto</option>
                                    <option value="access">Problema de Acesso</option>
                                    <option value="content">Erro no Conteúdo</option>
                                    <option value="bug">Dúvidas Técnicas</option>
                                    <option value="other">Outros</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mensagem</label>
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    required
                                    rows={4}
                                    placeholder="Descreva seu problema..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                                ></textarea>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Voltar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02]"
                                >
                                    Enviar
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
