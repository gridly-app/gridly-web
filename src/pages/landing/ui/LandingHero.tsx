import { Link } from "react-router-dom";
import { useSession } from "@/shared/auth";
import { Button, StaticText, TileBackdrop } from "@/shared/ui";
import landingStyles from "./LandingPage.module.css";

export function LandingHero() {
	const { user } = useSession();
	return (
		<section className={landingStyles.landingHero}>
			<TileBackdrop
				rows={12}
				classNames={{
					grid: landingStyles.heroGrid,
					fade: landingStyles.heroFade,
				}}
			/>
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
						render={<Link to={user ? "/app" : "/auth"} />}
					>
						{user ? "Мои склады" : "Войти"}
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
