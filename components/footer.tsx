"use client";

import React from "react";
import Link from "next/link";
import { Github, AtSign } from "lucide-react";

const Footer = () => {
	return (
		<div className="w-full my-5 absolute bottom-0 left-0 border-t min-h-max">
			<div className="mx-auto flex px-10 pt-5 items-start justify-evenly">
				<h2 className="text-2xl font-semibold">
					Nextify
					<span className="text-lg text-muted-foreground font-mono ml-1">
						v1.0
					</span>
				</h2>
				<div className="flex flex-col items-center sm:flex-row">
					<h5>
						Built by{" "}
						<Link
							href="https://github.com/DarthSalad"
							target="_blank"
							rel="noopener"
							className="underline"
						>
							darthsalad
						</Link>
					</h5>
					<div className="flex items-center mt-2 sm:m-0">
						<Link
							href="https://github.com/DarthSalad"
							target="_blank"
							rel="noopener"
						>
							<Github
								className="bg-secondary rounded-lg p-0.5 mr-5 sm:ml-5"
								size={25}
							/>
						</Link>
						<Link
							href="mailto:piyushmishra965@gmail.com"
							target="_blank"
							rel="noopener"
						>
							<AtSign className="bg-secondary rounded-lg p-0.5" size={25} />
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Footer;
