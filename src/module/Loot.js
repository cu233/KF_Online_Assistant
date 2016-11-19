/* 争夺模块 */
'use strict';
import * as Util from './Util';
import * as Msg from './Msg';
import * as Dialog from './Dialog';
import Const from './Const';
import {read as readConfig, write as writeConfig} from './Config';
import * as Public from './Public';
import * as Item from './Item';

// 争夺首页区域
let $lootArea;
// 争夺属性区域
let $properties;
// 属性点区域
let $points;
// 争夺记录区域
let $lootLog;
// 当前争夺属性
let propertyList;
// 附加属性点列表
let extraPointList;
// 道具使用情况
let itemUsedNumList;
// 争夺记录
let lootLog = '';

/**
 * 增强争夺首页
 */
export const enhanceLootIndexPage = function () {
    $lootArea = $('.kf_fw_ig1:first');
    $properties = $lootArea.find('> tbody > tr:nth-child(3) > td:first-child');
    $points = $lootArea.find('> tbody > tr:nth-child(3) > td:nth-child(2)');
    propertyList = getLootPropertyList();
    extraPointList = getExtraPointList();
    itemUsedNumList = Item.getItemUsedInfo($lootArea.find('> tbody > tr:nth-child(4) > td').html());
    $lootLog = $lootArea.find('> tbody > tr:nth-child(5) > td');
    lootLog = $lootLog.html();
    handlePropertiesArea();
    handlePointsArea();
    addLevelPointListSelect();
    addAttackBtns();
    enhanceLootLog(lootLog);
};

/**
 * 处理争夺属性区域
 */
const handlePropertiesArea = function () {
    let tipsIntro = '灵活和智力的抵消机制：\n战斗开始前，会重新计算战斗双方的灵活和智力；灵活=(自己的灵活值-(双方灵活值之和 x 33%))；智力=(自己的智力值-(双方智力值之和 x 33%))';
    let html = $properties.html()
        .replace(/(攻击力：)(\d+)/, '$1<span id="pdPro_s1" title="原值：$2">$2</span> <span id="pdNew_s1"></span>')
        .replace(/(生命值：\d+)\s*\(最大(\d+)\)/, '$1 (最大<span id="pdPro_s2" title="原值：$2">$2</span>) <span id="pdNew_s2"></span>')
        .replace(/(攻击速度：)(\d+)/, '$1<span id="pdPro_d1" title="原值：$2">$2</span> <span id="pdNew_d1"></span>')
        .replace(
            /(暴击几率：)(\d+)%\s*\(抵消机制见说明\)/,
            `$1<span id="pdPro_d2" title="原值：$2">$2</span>% <span class="pd_cfg_tips" title="${tipsIntro}">[?]</span> <span id="pdNew_d2"></span>`
        )
        .replace(
            /(技能释放概率：)(\d+)%\s*\(抵消机制见说明\)/,
            `$1<span id="pdPro_i1" title="原值：$2">$2</span>% <span class="pd_cfg_tips" title="${tipsIntro}">[?]</span> <span id="pdNew_i1"></span>`
        )
        .replace(/(防御：)(\d+)%减伤/, '$1<span id="pdPro_i2" title="原值：$2">$2</span>%减伤 <span id="pdNew_i2"></span>')
        .replace('技能伤害：攻击+(体质*5)+(智力*5)', '技能伤害：<span class="pd_custom_tips" id="pdSkillAttack" title="攻击+(体质*5)+(智力*5)"></span>');
    $properties.html(html).find('br:first').after('<span>剩余属性点：<span id="pdSurplusPoint"></span></span><br>');

    $properties.on('click', '[id^="pdPro_"]', function () {
        let $this = $(this);
        $this.hide();
        let name = $this.attr('id').replace('pdPro_', '');
        let step = 1;
        if (name === 's1') step = 5;
        else if (name === 's2') step = 20;
        else if (name === 'd1') step = 2;
        $(`<input data-name="${name}" type="number" value="${parseInt($this.text())}" min="1" step="${step}" ` +
            `style="width: 65px; margin-right: 5px;" title="${$this.attr('title')}">`
        ).insertAfter($this)
            .focus()
            .select()
            .blur(function () {
                let $this = $(this);
                let name = $this.data('name');
                let num = parseInt($this.val());
                if (num > 0) {
                    $points.find(`[name="${name}"]`).val(getPointByProperty(getPointNameByFieldName(name), num)).trigger('change');
                }
                $this.prev().show().end().remove();
            })
            .keydown(function (e) {
                let $this = $(this);
                if (e.keyCode === 13) $this.blur();
                else if (e.keyCode === 27) $this.val('').blur();
            });
    }).find('[id^=pdPro_]').css('cursor', 'pointer');
};

/**
 * 处理属性点区域
 */
const handlePointsArea = function () {
    $points.find('[type="text"]').attr('type', 'number').attr('min', 1).attr('max', 999).prop('required', true).css('width', '60px');
    $points.find('input[readonly]').attr('min', 0).prop('disabled', true).removeProp('required', true);

    /**
     * 显示各项属性点的和值
     * @param {jQuery} $point 属性点字段对象
     */
    const showSumOfPoint = function ($point) {
        let num = parseInt($point.val());
        if (isNaN(num) || num < 0) num = 0;
        let extraNum = parseInt($point.next('span').text());
        let $sum = $point.next('span').next('.pd_point_sum');
        if (!$sum.length) {
            $sum = $('<span class="pd_point_sum" style="color: #ff0033; cursor: pointer;" title="点击：给该项加上或减去剩余属性点"></span>')
                .insertAfter($point.next('span'));
        }
        $sum.text('=' + (num + extraNum));
    };

    $points.on('change', '[type="number"]', function () {
        let $this = $(this);
        let surplusPoint = propertyList.get('可分配属性点') - getCurrentAssignedPoint($points.find('[type="number"]'));
        $('#pdSurplusPoint').text(surplusPoint)
            .css('color', surplusPoint !== 0 ? '#f00' : '#000')
            .css('font-weight', surplusPoint !== 0 ? 'bold' : 'normal');
        showNewLootProperty($this);
        showSumOfPoint($this);
        $('#pdSkillAttack').text(
            getSkillAttack(
                parseInt($lootArea.find('[name="s1"]').val()),
                parseInt($lootArea.find('[name="s2"]').val()),
                parseInt($lootArea.find('[name="i1"]').val())
            )
        );
    }).on('click', '.pd_point_sum', function () {
        let surplusPoint = propertyList.get('可分配属性点') - getCurrentAssignedPoint($points.find('[type="number"]'));
        if (!surplusPoint) return;
        let $point = $(this).prev('span').prev('[type="number"]:not([disabled])');
        if (!$point.length) return;
        let num = parseInt($point.val());
        if (isNaN(num) || num < 0) num = 0;
        $point.val(num + surplusPoint).trigger('change');
    }).find('form').submit(function () {
        let surplusPoint = propertyList.get('可分配属性点') - getCurrentAssignedPoint($points.find('[type="number"]'));
        if (surplusPoint < 0) {
            alert('剩余属性点为负，请重新填写');
            return false;
        }
        else if (surplusPoint > 0) {
            return confirm('你的可分配属性点尚未用完，是否提交？');
        }
    }).find('[type="number"]').trigger('change');
};

/**
 * 获取争夺属性列表
 * @returns {Map} 争夺属性
 */
const getLootPropertyList = function () {
    let propertyList = new Map([
        ['攻击力', 0],
        ['最大生命值', 0],
        ['攻击速度', 0],
        ['暴击几率', 0],
        ['技能释放概率', 0],
        ['防御', 0],
        ['可分配属性点', 0],
    ]);
    let html = $properties.html();
    let matches = /攻击力：(\d+)/.exec(html);
    if (matches) propertyList.set('攻击力', parseInt(matches[1]));
    matches = /生命值：\d+\s*\(最大(\d+)\)/.exec(html);
    if (matches) propertyList.set('最大生命值', parseInt(matches[1]));
    matches = /攻击速度：(\d+)/.exec(html);
    if (matches) propertyList.set('攻击速度', parseInt(matches[1]));
    matches = /暴击几率：(\d+)%/.exec(html);
    if (matches) propertyList.set('暴击几率', parseInt(matches[1]));
    matches = /技能释放概率：(\d+)%/.exec(html);
    if (matches) propertyList.set('技能释放概率', parseInt(matches[1]));
    matches = /防御：(\d+)%/.exec(html);
    if (matches) propertyList.set('防御', parseInt(matches[1]));
    matches = /可分配属性点：(\d+)/.exec(html);
    if (matches) propertyList.set('可分配属性点', parseInt(matches[1]));
    return propertyList;
};

/**
 * 获取当前已分配的属性点
 * @param {jQuery} $points 属性点字段对象
 * @returns {number} 当前已分配的属性点
 */
const getCurrentAssignedPoint = function ($points) {
    let usedPoint = 0;
    $points.each(function () {
        let point = parseInt($(this).val());
        if (point && point > 0) usedPoint += point;
    });
    return usedPoint;
};

/**
 * 获取技能伤害的值
 * @param {number} s1 力量
 * @param {number} s2 体质
 * @param {number} i1 智力
 * @returns {number} 技能伤害的值
 */
const getSkillAttack = (s1, s2, i1) => (s1 + extraPointList.get('力量')) * 5 + s2 * 5 + i1 * 5;

/**
 * 获取附加属性点列表
 * @returns {Map} 附加属性点列表
 */
const getExtraPointList = function () {
    let extraPointList = new Map([
        ['力量', 0],
        ['体质', 0],
        ['敏捷', 0],
        ['灵活', 0],
        ['智力', 0],
        ['意志', 0],
        ['耐力', 0],
        ['幸运', 0],
    ]);
    $points.find('[type="text"]').each(function () {
        let $this = $(this);
        let name = $this.attr('name');
        let num = parseInt($this.next('span').text());
        let key = getPointNameByFieldName(name);
        if (!isNaN(num) && key) {
            extraPointList.set(key, num);
        }
    });
    return extraPointList;
};

/**
 * 根据字段名称获取属性点名称
 * @param {string} fieldName 字段名称
 * @returns {string} 属性点名称
 */
const getPointNameByFieldName = function (fieldName) {
    switch (fieldName) {
        case 's1':
            return '力量';
        case 's2':
            return '体质';
        case 'd1':
            return '敏捷';
        case 'd2':
            return '灵活';
        case 'i1':
            return '智力';
        case 'i2':
            return '意志';
        case 'p':
            return '耐力';
        case 'l':
            return '幸运';
        default:
            return '';
    }
};

/**
 * 根据属性点名称获取字段名称
 * @param {string} pointName 属性点名称
 * @returns {string} 字段名称
 */
const getFieldNameByPointName = function (pointName) {
    switch (pointName) {
        case '力量':
            return 's1';
        case '体质':
            return 's2';
        case '敏捷':
            return 'd1';
        case '灵活':
            return 'd2';
        case '智力':
            return 'i1';
        case '意志':
            return 'i2';
        case '耐力':
            return 'p';
        case '幸运':
            return 'l';
        default:
            return '';
    }
};

/**
 * 显示新的争夺属性
 * @param {jQuery} $point 属性点字段对象
 */
const showNewLootProperty = function ($point) {
    let name = $point.attr('name');
    let pointName = getPointNameByFieldName(name);
    let point = parseInt($point.val());
    if (isNaN(point) || point < 0) point = 0;
    let oriPoint = parseInt($point.get(0).defaultValue);
    let newValue = getPropertyByPoint(pointName, point), diffValue = 0;
    switch (pointName) {
        case '力量':
            diffValue = newValue - propertyList.get('攻击力');
            break;
        case '体质':
            diffValue = newValue - propertyList.get('最大生命值');
            break;
        case '敏捷':
            diffValue = newValue - propertyList.get('攻击速度');
            break;
        case '灵活':
            diffValue = newValue - propertyList.get('暴击几率');
            break;
        case '智力':
            diffValue = newValue - propertyList.get('技能释放概率');
            break;
        case '意志':
            diffValue = newValue - propertyList.get('防御');
            break;
    }
    $('#pdPro_' + name).text(newValue).css('color', point !== oriPoint ? '#00f' : '#000');

    if (point !== oriPoint)
        $('#pdNew_' + name).text(`(${(diffValue >= 0 ? '+' : '') + diffValue})`).css('color', diffValue >= 0 ? '#ff0033' : '#339933');
    else
        $('#pdNew_' + name).text('');
};

/**
 * 根据指定的属性点获得相应争夺属性的值
 * @param pointName 属性点名称
 * @param point 属性点的值
 * @returns {number} 争夺属性的值
 */
const getPropertyByPoint = function (pointName, point) {
    let extraPoint = extraPointList.get(pointName);
    if (!extraPoint) extraPoint = 0;
    let value = 0;
    switch (pointName) {
        case '力量':
            value = (point + extraPoint) * 5;
            break;
        case '体质':
            value = (point + extraPoint) * 20 + (itemUsedNumList.get('蕾米莉亚同人漫画') === 50 ? 700 : 0);
            break;
        case '敏捷':
            value = (point + extraPoint) * 2 + (itemUsedNumList.get('十六夜同人漫画') === 50 ? 100 : 0);
            break;
        case '灵活':
            value = point + extraPoint;
            value = Math.round(value / (value + 100) * 100);
            break;
        case '智力':
            value = point + extraPoint;
            value = Math.round(value / (value + 90) * 100);
            break;
        case '意志':
            value = point + extraPoint;
            value = Math.round(value / (value + 150) * 100);
            break;
    }
    return value;
};

/**
 * 根据指定的争夺属性获得相应属性点的值
 * @param pointName 属性点名称
 * @param num 争夺属性的值
 * @returns {number} 属性点的值
 */
const getPointByProperty = function (pointName, num) {
    let value = 0;
    switch (pointName) {
        case '力量':
            value = Math.round(num / 5) - extraPointList.get('力量');
            break;
        case '体质':
            value = Math.round((itemUsedNumList.get('蕾米莉亚同人漫画') === 50 ? num - 700 : num) / 20) - extraPointList.get('体质');
            break;
        case '敏捷':
            value = Math.round((itemUsedNumList.get('十六夜同人漫画') === 50 ? num - 100 : num) / 2) - extraPointList.get('敏捷');
            break;
        case '灵活':
            value = Math.round(100 * num / (100 - num)) - extraPointList.get('灵活');
            break;
        case '智力':
            value = Math.round(90 * num / (100 - num)) - extraPointList.get('智力');
            break;
        case '意志':
            value = Math.round(150 * num / (100 - num)) - extraPointList.get('意志');
            break;
    }
    if (!isFinite(value) || value <= 0) value = 1;
    return value;
};

/**
 * 添加每层属性点分配方案选择框
 */
const addLevelPointListSelect = function () {
    $(`
<select id="pdLevelPointListSelect" style="margin: 5px 0;">
  <option>属性点分配方案</option>
  <option value="edit" style="color: #00f;">编辑&hellip;</option>
  <option value="0">默认</option>
</select>
<a class="pd_btn_link" data-name="save" href="#" title="将当前属性点设置保存为新的方案">保存</a><br>
`).prependTo($points).filter('#pdLevelPointListSelect').change(function () {
        let level = $(this).val();
        if (level === '0') {
            $points.find('[type="number"]').each(function () {
                $(this).val(this.defaultValue);
            }).trigger('change');
        }
        else if (level === 'edit') {
            showLevelPointListConfigDialog();
            this.selectedIndex = 0;
        }
        else if ($.isNumeric(level)) {
            let points = Config.levelPointList[parseInt(level)];
            if (typeof points !== 'object') return;
            $points.find('[type="number"]').each(function () {
                let $this = $(this);
                $this.val(points[getPointNameByFieldName($this.attr('name'))]);
            }).trigger('change');
        }
    }).end().filter('[data-name="save"]').click(function (e) {
        e.preventDefault();
        let surplusPoint = propertyList.get('可分配属性点') - getCurrentAssignedPoint($points.find('[type="number"]'));
        if (surplusPoint < 0) {
            alert('剩余属性点为负，请重新填写');
            return;
        }
        let level = parseInt(prompt('请输入层数：'));
        if (!level || level < 0) return;

        readConfig();
        if (level in Config.levelPointList) {
            if (!confirm('该层数已存在，是否覆盖？')) return;
        }
        let points = {};
        for (let elem of Array.from($points.find('[type="number"]:not([disabled])'))) {
            let $elem = $(elem);
            let point = parseInt($elem.val());
            if (!point || point < 0) return;
            points[getPointNameByFieldName($elem.attr('name'))] = point;
        }
        Config.levelPointList[level] = points;
        writeConfig();
        setLevelPointListSelect(Config.levelPointList);
        $('#pdLevelPointListSelect').val(level);
    });
    setLevelPointListSelect(Config.levelPointList);
};

/**
 * 设置每层属性点分配方案选择框
 * @param {{}} levelPointList 每层属性点分配列表
 */
const setLevelPointListSelect = function (levelPointList) {
    let pointListHtml = '';
    for (let level of Object.keys(levelPointList)) {
        pointListHtml += `<option value="${level}">第${level}层</option>`;
    }
    $('#pdLevelPointListSelect').find('option:gt(2)').remove().end().append(pointListHtml);
};

/**
 * 显示每层属性点分配方案对话框
 */
const showLevelPointListConfigDialog = function (callback) {
    const dialogName = 'pdLevelPointListConfigDialog';
    if ($('#' + dialogName).length > 0) return;
    readConfig();
    let html = `
<div class="pd_cfg_main">
  <div style="margin-top: 5px;">请填写相应层数对应的属性点分配方案，相邻层数如数值完全相同的话，则只保留最前面的一层</div>
  <div style="overflow-y: auto; max-height: 400px;">
    <table id="pdLevelPointList" style="text-align: center; white-space: nowrap;">
      <tbody>
        <tr><th></th><th>层数</th><th>力量</th><th>体质</th><th>敏捷</th><th>灵活</th><th>智力</th><th>意志</th><th></th></tr>
      </tbody>
    </table>
  </div>
  <hr>
  <div style="float: left; line-height: 27px;">
    <a class="pd_btn_link" data-name="selectAll" href="#">全选</a>
    <a class="pd_btn_link" data-name="selectInverse" href="#">反选</a>
    <a class="pd_btn_link pd_highlight" data-name="add" href="#">增加</a>
    <a class="pd_btn_link" data-name="deleteSelect" href="#">删除</a>
  </div>
  <div data-id="modifyArea" style="float: right;">
    <input name="s1" type="text" maxlength="4" title="力量" placeholder="力量" style="width: 35px;">
    <input name="s2" type="text" maxlength="4" title="体质" placeholder="体质" style="width: 35px;">
    <input name="d1" type="text" maxlength="4" title="敏捷" placeholder="敏捷" style="width: 35px;">
    <input name="d2" type="text" maxlength="4" title="灵活" placeholder="灵活" style="width: 35px;">
    <input name="i1" type="text" maxlength="4" title="智力" placeholder="智力" style="width: 35px;">
    <input name="i2" type="text" maxlength="4" title="意志" placeholder="意志" style="width: 35px;">
    <a class="pd_btn_link" data-name="clear" href="#" title="清空修改字段">&times;</a>
    <button type="button" name="modify">修改</button>
    <span class="pd_cfg_tips" title="可将所选择的层数的相应属性修改为指定的数值；数字前可设+/-号，表示增加/减少相应数量；例：100、+5或-2">[?]</span>
  </div>
</div>
<div class="pd_cfg_btns">
  <span class="pd_cfg_about"><a data-name="openImOrExLevelPointListConfigDialog" href="#">导入/导出分配设置</a></span>
  <button type="submit">确定</button>
  <button type="button" name="cancel">取消</button>
</div>`;
    let $dialog = Dialog.create(dialogName, '每层属性点分配方案', html, 'min-width: 665px;');
    let $levelPointList = $dialog.find('#pdLevelPointList > tbody');

    /**
     * 添加每层属性点分配的HTML
     * @param {number} level 层数
     * @param {{}} points 属性点对象
     */
    const addLevelPointHtml = function (level, points) {
        $(`
<tr>
  <td style="width: 25px; text-align: left;"><input type="checkbox"></td>
  <td style="text-align: left;">
    <label style="margin-right: 8px;">
      第 <input name="level" type="text" value="${level ? level : ''}" style="width: 30px;"> 层
    </label>
  </td>
  <td><input name="s1" type="number" min="1" max="999" value="${points['力量']}" style="width: 50px;" required></td>
  <td><input name="s2" type="number" min="1" max="999" value="${points['体质']}" style="width: 50px;" required></td>
  <td><input name="d1" type="number" min="1" max="999" value="${points['敏捷']}" style="width: 50px;" required></td>
  <td><input name="d2" type="number" min="1" max="999" value="${points['灵活']}" style="width: 50px;" required></td>
  <td><input name="i1" type="number" min="1" max="999" value="${points['智力']}" style="width: 50px;" required></td>
  <td><input name="i2" type="number" min="1" max="999" value="${points['意志']}" style="width: 50px;" required></td>
  <td style="text-align: left;"><a class="pd_btn_link" data-name="delete" href="#">删除</a></td>
</tr>
<tr>
  <td></td>
  <td class="pd_custom_tips" title="剩余属性点">剩余：<span data-id="surplusPoint">0</span></td>
  <td title="攻击力">攻：<span data-id="pro_s1" style="cursor: pointer;">0</span> <a data-id="opt_s1" href="#" title="点击：给该项加上或减去剩余属性点">&#177;</a></td>
  <td title="最大生命值">命：<span data-id="pro_s2" style="cursor: pointer;">0</span> <a data-id="opt_s2" href="#" title="点击：给该项加上或减去剩余属性点">&#177;</a></td>
  <td title="攻击速度">速：<span data-id="pro_d1" style="cursor: pointer;">0</span> <a data-id="opt_d1" href="#" title="点击：给该项加上或减去剩余属性点">&#177;</a></td>
  <td title="暴击几率">暴：<span data-id="pro_d2" style="cursor: pointer;">0</span>% <a data-id="opt_d2" href="#" title="点击：给该项加上或减去剩余属性点">&#177;</a></td>
  <td title="技能释放概率">技：<span data-id="pro_i1" style="cursor: pointer;">0</span>% <a data-id="opt_i1" href="#" title="点击：给该项加上或减去剩余属性点">&#177;</a></td>
  <td title="防御减伤">防：<span data-id="pro_i2" style="cursor: pointer;">0</span>% <a data-id="opt_i2" href="#" title="点击：给该项加上或减去剩余属性点">&#177;</a></td>
  <td class="pd_custom_tips" title="技能伤害：攻击伤害+(体质点数*6)">技伤：<span data-id="skillAttack">0</span></td>
</tr>
`).appendTo($levelPointList).find('[type="number"]').trigger('change');
    };

    $dialog.submit(function (e) {
        e.preventDefault();
        readConfig();
        Config.levelPointList = {};
        let prevPoints = {};
        let isError = false, isSurplus = false;
        $levelPointList.find('tr:gt(0)').each(function () {
            let $this = $(this);
            if (!$this.find('input').length) return;
            let surplusPoint = propertyList.get('可分配属性点') - getCurrentAssignedPoint($this.find('[type="number"]'));
            if (surplusPoint > 0) isSurplus = true;
            else if (surplusPoint < 0) isError = true;

            let level = parseInt($this.find('[name="level"]').val());
            if (!level || level < 0) return;
            let points = {};
            for (let elem of Array.from($this.find('[type="number"]'))) {
                let $elem = $(elem);
                let point = parseInt($elem.val());
                if (!point || point < 0) return;
                points[getPointNameByFieldName($elem.attr('name'))] = point;
            }
            if (Util.deepEqual(prevPoints, points)) return;
            Config.levelPointList[level] = points;
            prevPoints = points;
        });
        if (isSurplus) {
            if (!confirm('部分层数的可分配属性点尚未用完，是否提交？')) return;
        }
        if (isError) {
            alert('部分层数的剩余属性点为负，请重新填写');
            return;
        }
        writeConfig();
        Dialog.close(dialogName);
        setLevelPointListSelect(Config.levelPointList);
    }).find('[data-name="selectAll"]').click(() => Util.selectAll($levelPointList.find('[type="checkbox"]')))
        .end().find('[data-name="selectInverse"]').click(() => Util.selectInverse($levelPointList.find('[type="checkbox"]')))
        .end().find('[data-name="add"]')
        .click(function (e) {
            e.preventDefault();
            addLevelPointHtml(0, {'力量': 1, '体质': 1, '敏捷': 1, '灵活': 1, '智力': 1, '意志': 1});
            Dialog.show(dialogName);
        }).end().find('[data-name="deleteSelect"]')
        .click(function (e) {
            e.preventDefault();
            let $checked = $levelPointList.find('[type="checkbox"]:checked');
            if (!$checked.length || !confirm('是否删除所选层数？')) return;
            let $line = $checked.closest('tr');
            $line.next('tr').addBack().remove();
            Dialog.show(dialogName);
        }).end().find('[data-name="openImOrExLevelPointListConfigDialog"]')
        .click(function (e) {
            e.preventDefault();
            Public.showCommonImportOrExportConfigDialog(
                '每层属性点分配方案',
                'levelPointList',
                null,
                function () {
                    $('#pdLevelPointListConfigDialog').remove();
                    showLevelPointListConfigDialog($dialog => $dialog.submit());
                }
            );
        }).end().find('[name="cancel"]').click(() => Dialog.close(dialogName));

    $levelPointList.on('click', '[data-name="delete"]', function (e) {
        e.preventDefault();
        let $line = $(this).closest('tr');
        $line.next('tr').addBack().remove();
        Dialog.show(dialogName);
    }).on('change', '[type="number"]', function () {
        let $this = $(this);
        let name = $this.attr('name');
        let point = parseInt($this.val());
        if (!point || point < 0) return;

        let $points = $this.closest('tr');
        let $properties = $points.next('tr');
        $properties.find(`[data-id="pro_${name}"]`)
            .text(getPropertyByPoint(getPointNameByFieldName(name), point))
            .end().find('[data-id="skillAttack"]')
            .text(
                getSkillAttack(
                    parseInt($points.find('[name="s1"]').val()),
                    parseInt($points.find('[name="s2"]').val()),
                    parseInt($points.find('[name="i1"]').val())
                )
            );

        let surplusPoint = propertyList.get('可分配属性点') - getCurrentAssignedPoint($points.find('[type="number"]'));
        $properties.find('[data-id="surplusPoint"]').text(surplusPoint).css('color', surplusPoint !== 0 ? '#f00' : '#000');
    }).on('click', '[data-id^="pro_"]', function () {
        let $this = $(this);
        let name = $this.data('id').replace('pro_', '');
        let num = parseInt(prompt('请输入数值：', $this.text()));
        if (!num || num < 0) return;
        $this.closest('tr').prev('tr').find(`[name="${name}"]`).val(getPointByProperty(getPointNameByFieldName(name), num)).trigger('change');
    }).on('click', '[data-id^="opt_"]', function (e) {
        e.preventDefault();
        let $this = $(this);
        let name = $this.data('id').replace('opt_', '');
        let $points = $this.closest('tr').prev('tr');
        let surplusPoint = propertyList.get('可分配属性点') - getCurrentAssignedPoint($points.find('[type="number"]'));
        if (!surplusPoint) return;
        let $point = $points.find(`[name="${name}"]`);
        if (!$point.length) return;
        let num = parseInt($point.val());
        if (isNaN(num) || num < 0) num = 0;
        $point.val(num + surplusPoint).trigger('change');
    });

    $dialog.find('[data-id="modifyArea"]').on('keydown', '[type="text"]', function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            $(this).closest('div').find('[name="modify"]').click();
        }
    }).find('[name="modify"]').click(function () {
        let $checked = $levelPointList.find('[type="checkbox"]:checked');
        if (!$checked.length) return;
        let data = {};
        $dialog.find('[data-id="modifyArea"] [type="text"]').each(function () {
            let $this = $(this);
            let name = $this.attr('name');
            let value = $.trim($this.val());
            if (!value) return;
            let matches = /^(-|\+)?(\d+)$/.exec(value);
            if (!matches) {
                alert('格式不正确');
                $this.select().focus();
            }
            data[name] = {};
            if (typeof matches[1] !== 'undefined') data[name].action = matches[1] === '+' ? 'add' : 'minus';
            else data[name].action = 'equal';
            data[name].value = parseInt(matches[2]);
        });
        $checked.each(function () {
            let $points = $(this).closest('tr');
            $points.find('[type="number"]').each(function () {
                let $this = $(this);
                let name = $this.attr('name');
                if (!(name in data)) return;
                if (data[name].action !== 'equal') {
                    let point = parseInt($this.val());
                    if (!point || point < 0) point = 0;
                    $this.val(point + (data[name].action === 'add' ? data[name].value : -data[name].value));
                }
                else $this.val(data[name].value);
            }).trigger('change');
        });
    }).end().find('[data-name="clear"]').click(function (e) {
        e.preventDefault();
        $(this).closest('[data-id="modifyArea"]').find('[type="text"]').val('');
    });

    for (let [level, points] of Util.entries(Config.levelPointList)) {
        addLevelPointHtml(level, points);
    }

    Dialog.show(dialogName);
    $dialog.find('input:first').focus();
    if (typeof callback === 'function') callback($dialog);
};

/**
 * 添加攻击相关按钮
 */
const addAttackBtns = function () {
    $(`
<label title="攻击时可自动修改成相应的属性点分配方案，被击败后还原为最低层数的方案">
  <input class="pd_input" name="autoChangeLevelPoints" type="checkbox"> 自动修改每层属性点分配方案
</label><br>
<button name="continuingAttack" type="button" title="连续攻击到指定层数">连续攻击</button>
<button name="onceAttack" type="button" title="每次只攻击一层">攻击一层</button>
`).appendTo($points).filter('[name="continuingAttack"], [name="onceAttack"]').click(function () {
        if (/你被击败了/.test(lootLog)) {
            alert('你已经被击败了');
            return;
        }
        let $this = $(this);
        let type = $this.is('[name="continuingAttack"]') ? 'continue' : 'once';
        let targetLevel = 0;
        if (type === 'continue') {
            targetLevel = parseInt(prompt('攻击到第几层？（设为0表示攻击到被击败为止）', 0));
            if (isNaN(targetLevel) || targetLevel < 0) return;
        }
        $this.blur();
        Msg.destroy();
        let isChangePoints = Config.autoChangeLevelPointsEnabled && !$.isEmptyObject(Config.levelPointList);
        let currentLevel = getCurrentMaxLevel(lootLog);
        let $wait = Msg.wait(
            `<strong>正在攻击中，请稍后&hellip;</strong><i>当前层数：<em class="pd_countdown">${currentLevel}</em></i>` +
            '<a class="pd_stop_action" href="#">停止操作</a><br><span class="pd_notice">（请不要访问论坛的其它页面）</span>'
        );

        /**
         * 修改属性点
         * @param {number} nextLevel 下一层
         * @returns {Deferred} Deferred对象
         */
        const modifyPoints = function (nextLevel) {
            let $levelPointListSelect = $('#pdLevelPointListSelect');
            let changeLevel = Math.max(...Object.keys(Config.levelPointList).filter(level => level <= nextLevel));
            if (changeLevel !== parseInt($levelPointListSelect.val())) {
                $levelPointListSelect.val(changeLevel).trigger('change');
                $points.find('[type="number"]').each(function () {
                    this.defaultValue = $(this).val();
                }).trigger('change');
                return $.ajax({
                    type: 'POST',
                    url: 'kf_fw_ig_enter.php',
                    timeout: Const.defAjaxTimeout,
                    data: $points.find('form').serialize(),
                }).then(function (html) {
                    let {msg} = Util.getResponseMsg(html);
                    if (/已经重新配置加点！/.test(msg)) {
                        console.log(`【分配属性点】已修改为第${changeLevel}层的方案`);
                        return 'success';
                    }
                    else {
                        alert(msg);
                        return 'error';
                    }
                }, (XMLHttpRequest, textStatus) => textStatus === 'timeout' ? 'timeout' : 'error');
            }
            else return $.Deferred().resolve('success');
        };

        /**
         * 攻击
         */
        const attack = function () {
            $.ajax({
                type: 'GET',
                url: 'kf_fw_ig_index.php?t=' + new Date().getTime(),
                timeout: Const.defAjaxTimeout,
            }).done(function (html) {
                let matches = /<tr><td.+?>\r\n(在\[\d+层\]你.+?<br\s*\/?>)<\/td><\/tr>/i.exec(html);
                if (!matches) {
                    Msg.remove($wait);
                    return;
                }
                lootLog = matches[1];
                enhanceLootLog(lootLog);

                let currentLevel = getCurrentMaxLevel(lootLog);
                console.log('【争夺攻击】当前层数：' + currentLevel);
                let $countdown = $('.pd_countdown:last');
                $countdown.text(currentLevel);

                let isFail = /你被击败了/.test(lootLog);
                let isStop = isFail || type !== 'continue' || (targetLevel && currentLevel >= targetLevel) ||
                    $countdown.closest('.pd_msg').data('stop');
                if (isStop) {
                    Msg.remove($wait);
                    Msg.show(`<strong>你进攻到了第<em>${currentLevel}</em>层</strong>`);
                    if (isChangePoints && isFail) {
                        let $wait = Msg.wait('<strong>正在修改属性点分配&hellip;</strong>');
                        modifyPoints(Math.min(...Object.keys(Config.levelPointList))).always(function () {
                            Msg.remove($wait);
                        });
                    }
                }
                else {
                    if (isChangePoints) {
                        setTimeout(function () {
                            readyAttack(currentLevel)
                        }, Const.defAjaxInterval);
                    }
                    else {
                        setTimeout(function () {
                            attack();
                        }, typeof Const.lootAttackInterval === 'function' ? Const.lootAttackInterval() : Const.lootAttackInterval);
                    }
                }
            }).fail(function (XMLHttpRequest, textStatus) {
                if (textStatus === 'timeout') {
                    console.log('【争夺攻击】超时重试……');
                    setTimeout(() => attack, Const.defAjaxInterval);
                }
            });
        };

        /**
         * 准备攻击（用于自动修改每层属性点分配方案）
         * @param {number} currentLevel 当前层数
         * @param {number} interval 下次攻击的间隔时间
         */
        const readyAttack = function (currentLevel, interval = Const.lootAttackInterval) {
            modifyPoints(currentLevel + 1).done(function (result) {
                if (result === 'success') setTimeout(() => attack(), typeof interval === 'function' ? interval() : interval);
                else if (result === 'timeout') readyAttack(currentLevel + 1, interval);
                else Msg.remove($wait);
            });
        };

        if (isChangePoints) readyAttack(currentLevel, 0);
        else attack();
    }).end().find('[name="autoChangeLevelPoints"]').click(function () {
        readConfig();
        Config.autoChangeLevelPointsEnabled = $(this).prop('checked');
        writeConfig();
    }).prop('checked', Config.autoChangeLevelPointsEnabled);
};

/**
 * 增强争夺记录
 */
const enhanceLootLog = function (log) {
    let {exp, kfb} = getLootTotalGain(log);
    log = log.replace('<span style="color:#000FFF;font-weight:bold;">你被击败了</span>', '<b class="pd_highlight">你被击败了</b>')
        .replace(/(#你发起了进攻：)/g, '<span style="color: #009900;">$1</span>')
        .replace(/(对方攻击了你：)/g, '<span style="color: #cc3399;">$1</span>');
    $lootLog.html(`<b class="pd_stat">你总共获得了<em>${exp.toLocaleString()}</em>经验和<em>${kfb.toLocaleString()}</em>KFB</b><br>${log}`);
};

/**
 * 获取当前的争夺总收获
 * @param {string} log 争夺记录
 * @returns {{exp: number, kfb: number}} exp：经验；kfb：KFB
 */
const getLootTotalGain = function (log) {
    let matches = log.match(/获得\d+经验和\d+KFB/g);
    let exp = 0, kfb = 0;
    for (let i in matches) {
        let logMatches = /获得(\d+)经验和(\d+)KFB/.exec(matches[i]);
        exp += parseInt(logMatches[1]);
        kfb += parseInt(logMatches[2]);
    }
    return {exp, kfb};
};

/**
 * 获取当前的争夺记录中的最高层数
 * @param {string} log 争夺记录
 * @returns {number} 最高层数
 */
const getCurrentMaxLevel = function (log) {
    let matches = log.match(/在\[(\d+)层]你/g);
    let maxLevel = 1;
    for (let i in matches) {
        let levelMatches = /\d+/.exec(matches[i]);
        let level = parseInt(levelMatches[0]);
        if (maxLevel < level) maxLevel = level;
    }
    return maxLevel;
};

/**
 * 在争夺排行页面添加用户链接
 */
export const addUserLinkInPkListPage = function () {
    $('.kf_fw_ig1 > tbody > tr:gt(1) > td:nth-child(2)').each(function () {
        let $this = $(this);
        let userName = $this.text().trim();
        $this.html(`<a href="profile.php?action=show&username=${userName}" target="_blank">${userName}</a>`);
    });
};
