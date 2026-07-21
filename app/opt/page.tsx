"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OptMenuRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/observations/opt/new");
    }, [router]);

    return (
        <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324354]"></div>
        </div>
    );
}
