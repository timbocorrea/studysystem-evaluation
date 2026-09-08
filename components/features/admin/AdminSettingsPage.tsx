import React, { useState, useEffect } from 'react';
import { AdminService } from '@/services/AdminService';
import { toast } from 'sonner';

interface AdminSettingsPageProps {
    adminService: AdminService;
}

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ adminService }) => {
    const [whatsapp, setWhatsapp] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const settings = await adminService.getSystemSettings();
            const wa = settings.find(s => s.key === 'support_whatsapp')?.value || '';
            const em = settings.find(s => s.key === 'support_email')?.value || '';
            const msg = settings.find(s => s.key === 'support_message')?.value || '';
            setWhatsapp(wa);
            setEmail(em);
            setMessage(msg);
        } catch (err) {
            console.error("Failed to load settings", err);
            // Optional: show error toast
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccessMessage(null);

        try {
            await Promise.all([
                adminService.updateSystemSetting('support_whatsapp', whatsapp),
                adminService.updateSystemSetting('support_email', email),
                adminService.updateSystemSetting('support_message', message)
            ]);
            setSuccessMessage("Configurações salvas com sucesso!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error("Failed to save settings", err);
            toast.error("Erro ao salvar configurações.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Configurações do Sistema</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie os canais de suporte e notificações.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <i className="fas fa-headset text-indigo-500"></i>
                        Canais de Suporte
                    </h2>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    {/* WhatsApp Support */}
                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">WhatsApp de Suporte</label>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">Número para redirecionamento do botão de WhatsApp (formato internacional sem +). Ex: 5511999999999</p>
                        <div className="flex gap-2">
                            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 flex-shrink-0">
                                <i className="fab fa-whatsapp text-xl"></i>
                            </div>
                            <input
                                type="text"
                                value={whatsapp}
                                onChange={e => setWhatsapp(e.target.value)}
                                placeholder="5511999999999"
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* WhatsApp Message */}
                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Mensagem Inicial do WhatsApp</label>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">Mensagem padrão que aparecerá para o usuário ao abrir o WhatsApp.</p>
                        <div className="flex gap-2">
                            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 flex-shrink-0">
                                <i className="fas fa-comment-dots text-xl"></i>
                            </div>
                            <input
                                type="text"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Olá, preciso de ajuda com o StudySystem."
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

                    {/* Notification Email */}
                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Email para Notificações</label>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">Email que receberá os tickets abertos via sistema.</p>
                        <div className="flex gap-2">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                <i className="fas fa-envelope text-xl"></i>
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="suporte@exemplo.com"
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Success Message */}
                    {successMessage && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-bold rounded-lg flex items-center gap-2 animate-in fade-in">
                            <i className="fas fa-check-circle"></i>
                            {successMessage}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center gap-2 ${saving ? 'opacity-70 cursor-wait' : 'hover:scale-105'}`}
                        >
                            {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
