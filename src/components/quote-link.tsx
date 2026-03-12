"use client";

export default function QuoteLink({ no }: { no: number }) {
    function handleClick(e: React.MouseEvent) {
        e.preventDefault();
        const el = document.getElementById(`post-${no}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.classList.add("bg-yellow-100");
        setTimeout(() => el?.classList.remove("bg-yellow-100"), 1500);
    }

    return (
        <a
            href={`#post-${no}`}
            onClick={handleClick}
            className="text-blue-700 hover:underline"
        >
            &gt;&gt;{no}
        </a>
    );
}
