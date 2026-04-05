/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    ...(process.env.STATIC_EXPORT === "1" ? { output: "export" } : {}),
};

export default nextConfig;
