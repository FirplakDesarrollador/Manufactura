import React from 'react'

export default function BIViewer() {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col animate-in fade-in duration-500">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#254153]">Business Intelligence (PowerBI)</h3>
            </div>
            <div className="flex-1 w-full bg-gray-100">
                <iframe
                    title="PowerBI Dashboard"
                    width="100%"
                    height="100%"
                    src="https://app.powerbi.com/view?r=eyJrIjoiN2MxNmUwZTUtYTY0MC00MmFjLWI2ZjctMDYzNDJlODU4MTk0IiwidCI6ImZhMWRlMDRmLTQ3ODAtNGQ4My1hOTQyLTkzYzdhZThkZWU5ZCIsImMiOjR9"
                    frameBorder="0"
                    allowFullScreen={true}
                    className="w-full h-full border-none"
                ></iframe>
            </div>
        </div>
    )
}
