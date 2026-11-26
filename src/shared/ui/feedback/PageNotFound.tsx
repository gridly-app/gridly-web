import { Link } from "react-router-dom";

import { Empty, EmptyDescription, EmptyHeader } from "../spaceui/empty";

export function PageNotFound() {
	return (
		<Empty>
			<EmptyHeader>
				<h1>Страница не найдена</h1>
				<EmptyDescription>
					Проверьте адрес страницы или откройте главную.
				</EmptyDescription>
			</EmptyHeader>
			<Link to="/">На главную</Link>
		</Empty>
	);
}
