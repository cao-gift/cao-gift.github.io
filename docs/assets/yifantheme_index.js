const style = document.createElement("style");
style.innerHTML = `
.blogTitle {
    display: unset;
}

#header {
    height: 300px;
}

#header h1 {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
}

.avatar {
    width: 200px;
    height: 200px;
}

#header h1 a {
    margin-top: 30px;
    font-family: fantasy;
    margin-left: unset;
}

html {
    background: url('https://img.liyifan.xyz/file/a2262c314f6a8bd592eba.jpg') no-repeat center center fixed;
    background-size: cover;
}

body {
    margin: 30px auto;
    padding: 20px;
    font-size: 16px;
    font-family: sans-serif;
    line-height: 1.25;
    background: rgba(255, 255, 255, 0.8); /* 白色背景，透明度80% */
    border-radius: 10px; /* 圆角边框 */
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5); /* 添加阴影 */
    overflow: auto;
}

.SideNav {
    background: rgba(255, 255, 255, 0.6); /* 白色背景，透明度60% */
    border-radius: 10px; /* 圆角边框 */
    min-width: unset;
}

.SideNav-item:hover {
    background-color: #c3e4e3;
    border-radius: 10px;
    transform: scale(1.02);
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

.SideNav-item {
    transition: 0.5s;
}

.pagination a:hover, .pagination a:focus, .pagination span:hover, .pagination span:focus, .pagination em:hover, .pagination em:focus {
    border-color: rebeccapurple;
}
`;
document.head.appendChild(style);
