import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TableHeaderProps {
    title: string;
    icon: LucideIcon;
}

const TableHeader: React.FC<TableHeaderProps> = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-2 mb-4">
        <h3 className="text-[#00a3e0] text-sm font-bold uppercase tracking-widest">{title}</h3>
        <Icon size={16} className="text-[#00a3e0]" />
    </div>
);

export default TableHeader;
