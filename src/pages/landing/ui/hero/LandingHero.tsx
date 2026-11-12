import { Link } from "react-router-dom";
import { useSession } from "@/shared/auth";
import { Button, StableLabel } from "@/shared/ui/controls";
import { AnimatedContent, ShapeBackdrop, StaticText } from "@/shared/ui/visual";
import landingStyles from "./LandingHero.module.css";

export function LandingHero() {
	const { user } = useSession();
	return (
		<section className={landingStyles.landingHero}>
			<ShapeBackdrop />
			<AnimatedContent className={landingStyles.heroCopy} distance={24}>
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
						render={<Link to={user ? "/app" : "/auth"} />}
					>
						<StableLabel variants={["Мои склады", "Войти"]}>
							{user ? "Мои склады" : "Войти"}
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
			</AnimatedContent>
		</section>
	);
}
