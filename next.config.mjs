/** @type {import('next').NextConfig} */
const nextConfig = {
    ...(process.env.STATIC_EXPORT === "1" ? { output: "export" } : {}),
};

export default nextConfig;
