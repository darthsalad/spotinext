"use client";

import React from "react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useToast } from "./ui/use-toast";

const Navbar = () => {
	const router = useRouter();
	const pathname = usePathname();
	const { toast } = useToast();

	const isLoginPage = pathname === "/auth/login";

	const logout = async () => {
		const res = await fetch("/api/auth", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
		});
		if (!res.ok) {
			toast({ title: "Something went wrong", description: res.statusText, variant: "destructive" });
			return;
		}
		const data = await res.json();
		router.push("/auth/login");
		toast({ title: data.message });
	};

	return (
		<div className="my-5 mx-auto px-10 pb-5 flex border-b item-center justify-between">
			<h2 className="text-3xl font-semibold">
				<Link href="/">Spotinext</Link>
				<span className="ml-1 font-bold bg-secondary text-sm px-2 rounded-xl font-mono">
					Beta
				</span>
			</h2>
			<div className="flex items-center">
				<div className="mr-5">
					<ThemeToggle />
				</div>
				{isLoginPage ? (
					<Button variant="secondary" onClick={() => router.push("/auth/login")}>
						Login
					</Button>
				) : (
					<Button variant="secondary" onClick={logout}>
						<LogOut size={18} className="mr-2" />
						Logout
					</Button>
				)}
			</div>
		</div>
	);
};

export default Navbar;
