export const Logo = () => {
	const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "Eletrosil";
	return (
		<div className="text-xl font-bold tracking-tight">
			{companyName}
		</div>
	);
};
