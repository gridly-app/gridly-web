import { IconArrowUpRight } from "@tabler/icons-react";

import { Button } from "@/shared/ui/controls";
import { ErrorNotice } from "@/shared/ui/feedback";
import { StaticText } from "@/shared/ui/visual";

import { useLandingSandbox } from "../../model/useLandingSandbox";

import landingStyles from "./LandingSandbox.module.css";

export function LandingSandbox() {
	const { handleOpenSandbox, isPending, error } = useLandingSandbox();

	return (
		<section id="sandbox" className={landingStyles.landingCta}>
			<div className={landingStyles.sandboxCopy}>
				<h2 className={landingStyles.sandboxTitle}>
					<StaticText text="Давайте приведём" />
					<br />
					<StaticText text="всё в движение." />
				</h2>
				<p className={landingStyles.sandboxDescription}>
					<StaticText text="Готовый склад с товарами, роботами и заказами. " />
					<br className={landingStyles.descriptionBreak} />
					<StaticText text="Исследуйте платформу и пробуйте свои сценарии." />
				</p>
				<ErrorNotice message={error} />
				<Button
					size="lg"
					className={landingStyles.ctaButton}
					onClick={handleOpenSandbox}
					disabled={isPending}
				>
					Открыть песочницу <IconArrowUpRight size={19} />
				</Button>
				<small className={landingStyles.sandboxNote}>
					<StaticText text="Без регистрации · Готовый склад" />
				</small>
			</div>
		</section>
	);
}
