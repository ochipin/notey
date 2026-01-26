---
catchcopy: ''
favicon: '/favicon.png'
---

{{<card-grid>}}

{{%card title="ShortCodesによるカード" icon="tips" wide="true"%}}
カード内には記事の紹介記載します。
ShortCodesを利用して次のように記載することで、横いっぱいのカードにできます。

```sh
<card title="タイトル" icon="tips" wide=true>
  ...
</card>
```
ShortCodesは、必ず"`{{...}}`" で囲んでください。{{% icon name="tux" %}}s
{{%/card%}}


{{%card title="通常のカード1" icon="tips"%}}
`wide`を指定しなければ、カードは横に2つ並びます。
{{%/card%}}


{{% card title="通常のカード2" icon="tips" %}}
2枚目のカードは右側に配置されているはずです。
{{% /card %}}


{{% card title="キャッチコピー / 図の変更" icon="tips" wide=true %}}
_index.md内に記載している`catchcopy`を変更することでキャッチコピーを変更できます。また、`favicon.png` ファイルを置き換えることで、画像を変更できます。

完全にHOMEを変更する場合は、サイト内の`layouts/home.html`を直接変更します。
{{% /card %}}


{{% card title="記事のアイコンを設定する" icon="tips" wide=true %}}
Front Matterに次のように"icon"を指定することで、記事にアイコンを設定できます。

```yaml
---
title: 記事のタイトル
icon: tux
---
```
{{% /card %}}
{{</card-grid>}}

#### 利用できる記事のアイコン

| iconname         | icon                           | iconname         | icon                           |
|:--               |:--                             |:--               |:--                             |
| bug              | {{<icon name="bug">}}          | warning          | {{<icon name="warning">}}      |
| save             | {{<icon name="save">}}         | close            | {{<icon name="close">}}        |
| cloud            | {{<icon name="cloud">}}        | danger           | {{<icon name="danger">}}       |
| database         | {{<icon name="database">}}     | tips             | {{<icon name="tips">}}         |
| deploy,module    | {{<icon name="deploy">}}       | info             | {{<icon name="info">}}         |
| security         | {{<icon name="security">}}     | checkbox-on      | {{<icon name="checkbox-on">}}  |
| settings,config  | {{<icon name="settings">}}     | checkbox-off     | {{<icon name="checkbox-off">}} |
| circle           | {{<icon name="circle">}}       | tag              | {{<icon name="tag">}}          |
| star             | {{<icon name="star">}}         | search           | {{<icon name="search">}}       |
| book             | {{<icon name="book">}}         | right-arrow      | {{<icon name="right-arrow">}}  |
| remove,none      | {{<icon name="remove">}}       | copy             | {{<icon name="copy">}}         |
| guide            | {{<icon name="guide">}}        | docs             | {{<icon name="docs">}}         |
| dashboard        | {{<icon name="dashboard">}}    | link             | {{<icon name="link">}}         |
| overview         | {{<icon name="overview">}}     | arrow-right      | {{<icon name="arrow-right">}}  |
| thumb-up         | {{<icon name="thumb-up">}}     | arrow-left       | {{<icon name="arrow-left">}}   |
| thumb-down       | {{<icon name="thumb-down">}}   | unlink           | {{<icon name="unlink">}}       |
| help             | {{<icon name="help">}}         | brightness       | {{<icon name="brightness">}}   |
| home             | {{<icon name="home">}}         | light            | {{<icon name="light">}}        |
| windows          | {{<icon name="windows">}}      | translate        | {{<icon name="translate">}}    |
| git              | {{<icon name="git">}}          | edit             | {{<icon name="edit">}}         |
| mail             | {{<icon name="mail">}}         | menu             | {{<icon name="menu">}}         |
| terminal         | {{<icon name="terminal">}}     | drop-arrow       | {{<icon name="drop-arrow">}}   |
| date             | {{<icon name="date">}}         | tux, linux       | {{<icon name="tux">}}          |
| code             | {{<icon name="code">}}         | proxmox          | {{<icon name="proxmox">}}      |
| network          | {{<icon name="network">}}      | docker           | {{<icon name="docker">}}       |
| arrow-up         | {{<icon name="arrow-up">}}     | history          | {{<icon name="history">}}      |
