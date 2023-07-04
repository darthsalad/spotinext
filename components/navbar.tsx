"use client";

import React from "react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LogOut, MoreVertical, User } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useToast } from "./ui/use-toast";

const Navbar = () => {
	const router = useRouter();
	const { toast } = useToast();

	const {
		data: authStatus,
		isLoading,
		error,
	} = useQuery<boolean>({
		queryKey: ["auth"],
		queryFn: async (): Promise<boolean> => {
			const res = await fetch("/api/auth", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
			});
			if (!res.ok) {
				console.log("error", res.statusText);
				return false;
			}
			const data = await res.json();
			return data.auth;
		},
		refetchInterval: 5000,
		refetchOnWindowFocus: true,
	});

	const redirect = () => {
		router.push("/auth/login");
	};

	const logout = async () => {
		const res = await fetch("/api/auth", {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
		});
		if (!res.ok) {
			console.log("error", res.statusText);
			toast({
				title: "Something went wrong",
				description: res.statusText,
				variant: "destructive",
			});
		}
		const data = await res.json();
		toast({
			title: data.message,
		})
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
				{authStatus ? (
					<div>
						<div className="sm:hidden">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="secondary" size="icon">
										<MoreVertical />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => router.push("/account")}>
										<User size={18} className="mr-2" />
										Account
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => {
											logout();
											router.push("/");
										}}
									>
										<LogOut size={18} className="mr-2" />
										Logout
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						<div className="hidden sm:block">
							<Button
								className="mr-2"
								variant="secondary"
								onClick={() => {
									router.push("/account");
								}}
							>
								<User size={18} className="mr-2" />
								Account
							</Button>
							<Button
								variant="secondary"
								onClick={() => {
									logout();
									router.push("/");
								}}
							>
								<LogOut size={18} className="mr-2" />
								Logout
							</Button>
						</div>
					</div>
				) : (
					<Button variant="secondary" onClick={redirect}>
						Login
					</Button>
				)}
			</div>
		</div>
	);
};

export default Navbar;
