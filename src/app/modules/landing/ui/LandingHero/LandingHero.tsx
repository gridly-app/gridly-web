import { Link } from "react-router-dom";
import { useSession } from "@/ports/session";
import { Button, StableLabel } from "@/shared/ui/controls";
import { ShapeBackdrop, StaticText } from "@/shared/ui/visual";
import landingStyles from "./LandingHero.module.css";

export function LandingHero() {
	const { user } = useSession();
	const primaryAction = user
		? { to: "/app", label: "Мои склады" }
		: { to: "/auth", label: "Войти" };

	return (
		<section className={landingStyles.landingHero}>
			<ShapeBackdrop />
			<div className={landingStyles.heroCopy}>
				<h1>
					<StaticText text="Gridly" />
				</h1>
				<p className={landingStyles.heroDescription}>
					<StaticText text="Товары, роботы и процессы — в одном пространстве." />
					<StaticText text="Ваш склад. В вашем ритме." />
				</p>
				<div className={landingStyles.heroActions}>
					<Button
						size="lg"
						className={landingStyles.heroButton}
						render={<Link to={primaryAction.to} />}
					>
						<StableLabel variants={["Мои склады", "Войти"]}>
							{primaryAction.label}
						</StableLabel>
					</Button>
					{!user && (
						<Button
							size="lg"
							variant="secondary"
							className={`${landingStyles.heroButton} ${landingStyles.heroSecondary}`}
							render={<Link to="/auth?mode=register" />}
						>
							Зарегистрироваться
						</Button>
					)}
				</div>
			</div>
		</section>
	);
}
