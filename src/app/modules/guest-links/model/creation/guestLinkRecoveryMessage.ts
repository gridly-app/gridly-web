export function guestLinkRecoveryMessage(
	name: string,
	linkId?: string,
	mismatch?: boolean,
) {
	if (linkId) {
		return `Ссылка ${linkId} создана, но её URL больше недоступен. Отзовите её перед новым выпуском.`;
	}

	if (mismatch) {
		return "Сервер отклонил повтор с этим ключом. Проверьте список ссылок.";
	}

	return (
		`Сервер мог выпустить ссылку «${name}». Обновление списка не подтверждает исход этой попытки. ` +
		"Новый выпуск заблокирован, пока исход не станет известен."
	);
}
