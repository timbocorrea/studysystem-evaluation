import React from 'react';

interface BreadcrumbItem {
    label: string;
    icon?: string;
    onClick?: () => void;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    actions?: React.ReactNode;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, actions }) => {
    if (items.length === 0 && !actions) return null;

    return (
        <nav className="flex justify-between items-center w-full min-h-[48px]">
            <div className="flex items-center gap-2 text-sm overflow-x-auto no-scrollbar">
                {items.map((item, index) => (
                    <React.Fragment key={index}>
                        {/* Breadcrumb Item */}
                        {item.onClick ? (
                            <button
                                onClick={item.onClick}
                                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium group whitespace-nowrap"
                            >
                                {item.icon && <i className={`${item.icon} text-xs`}></i>}
                                <span className="group-hover:underline uppercase tracking-wider text-[10px] font-black">
                                    {item.label}
                                </span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 text-slate-800 dark:text-white font-black whitespace-nowrap">
                                {item.icon && <i className={`${item.icon} text-xs`}></i>}
                                <span className="uppercase tracking-wider text-[10px]">
                                    {item.label}
                                </span>
                            </div>
                        )}

                        {/* Separator */}
                        {index < items.length - 1 && (
                            <i className="fas fa-chevron-right text-[8px] text-slate-400 dark:text-slate-600 mx-1 shrink-0"></i>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Topbar Actions (Optional if passed through here) */}
            {actions && (
                <div className="flex items-center gap-2 ml-4">
                    {actions}
                </div>
            )}
        </nav>
    );
};

export default Breadcrumb;
