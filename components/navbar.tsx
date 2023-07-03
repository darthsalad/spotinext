"use client";

import React from "react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

const Navbar = () => {
	const router = useRouter();

	const redirect = () => {
		router.push("/auth/login");
	};

	return (
		<div className="my-5 mx-auto px-10 pb-5 flex border-b item-center justify-between">
			<h2 className="text-3xl font-semibold">
				<Link href="/">Nextify</Link>
				<span className="ml-1 font-bold bg-secondary text-sm px-2 rounded-xl font-mono">
					Beta
				</span>
			</h2>
			<div className="flex items-center">
				<div className="mr-5">
					<ThemeToggle />
				</div>
				{/* {localStorage.getItem("accessToken") ? (
					<Button
						variant="secondary"
						onClick={() => {
							localStorage.removeItem("accessToken");
							router.push("/");
						}}
					>
						Logout
					</Button>
				) : ( */}
				<Button variant="secondary" onClick={redirect}>
					Login
				</Button>
				{/* )} */}
			</div>
		</div>
	);
};

export default Navbar;
