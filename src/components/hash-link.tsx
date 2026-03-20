import { hashHref } from "../hooks/use-hash-router";

export default function HashLink({
    href,
    children,
    ...rest
}: { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
    return <a href={hashHref(href)} {...rest}>{children}</a>;
}
