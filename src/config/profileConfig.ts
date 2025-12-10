import type { ProfileConfig } from "../types/config";

export const profileConfig: ProfileConfig = {
	// 头像
	avatar: "/assets/images/avatar.webp",
	// 名字
	name: "bgspider",
	// 个人签名
	bio: "记录技术与思考，在代码的世界里寻找光亮",

	// 链接配置
	// 已经预装的图标集：fa6-brands，fa6-regular，fa6-solid，material-symbols，simple-icons
	// 访问https://icones.js.org/ 获取图标代码，
	// 如果想使用尚未包含相应的图标集，则需要安装它
	// `pnpm add @iconify-json/<icon-set-name>`
	// showName: true 时显示图标和名称，false 时只显示图标
	links: [
		// {
		// 	name: "Bilibli",
		// 	icon: "fa6-brands:bilibili",
		// 	url: "https://space.bilibili.com/38932988",
		// 	showName: false,
		// },
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/bgspiders",
			showName: false,
		},
		{
			name: "Email",
			icon: "fa6-solid:envelope",
			url: "bgspider99@gmail.com",
			showName: false,
		},
		{
			name: "RSS",
			icon: "fa6-solid:rss",
			url: "/rss/",
			showName: false,
		},
	],
};
