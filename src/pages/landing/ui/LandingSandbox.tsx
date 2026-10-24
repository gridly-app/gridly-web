import { IconArrowUpRight } from "@tabler/icons-react";
import { Button, ErrorNotice, StaticText } from "@/shared/ui";
import { useLandingDemo } from "../model/useLandingDemo";
import landingStyles from "./LandingPage.module.css";

export function LandingSandbox() {
	const { openDemo, pending, error } = useLandingDemo();

	return (
		<section id="sandbox" className={landingStyles["landing-cta"]}>
			<div className={landingStyles["sandbox-copy"]}>
				<h2>
					<StaticText text="Давайте приведём" />
					<br />
					<StaticText text="всё в движение." />
				</h2>
				<p>
					<StaticText text="Готовый демо-склад с товарами, роботами и заказами." />
					<br />
					<StaticText text="Исследуйте платформу и пробуйте свои сценарии." />
				</p>
				<ErrorNotice message={error} />
				<Button
					size="lg"
					className={landingStyles.ctaButton}
					onClick={() => {
						void openDemo();
					}}
					disabled={pending}
				>
					Открыть демо <IconArrowUpRight size={19} />
				</Button>
				<small className={landingStyles["sandbox-note"]}>
					<StaticText text="Без регистрации · Демо-данные в вашем браузере" />
				</small>
			</div>
			<div className={landingStyles["cta-pixels"]} aria-hidden="true">
				<i />
				<i />
				<i />
				<i />
			</div>
		</section>
	);
}
