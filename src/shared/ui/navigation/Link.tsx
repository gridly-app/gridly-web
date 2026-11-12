import { Link as RouterLink, type To } from "react-router-dom";
import { type LinkProps, Link as SpaceLink } from "../spaceui/link";

type AppLinkProps = Omit<LinkProps, "href" | "render"> &
	(
		| { to: To; href?: never; render?: never }
		| { to?: never; href?: LinkProps["href"]; render?: LinkProps["render"] }
	);

export function Link({ to, render, ...props }: AppLinkProps) {
	return (
		<SpaceLink
			{...props}
			render={to === undefined ? render : <RouterLink to={to} />}
		/>
	);
}
