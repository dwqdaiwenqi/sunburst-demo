/* eslint-disable no-multi-assign */
/* eslint-disable no-continue */
/* eslint-disable no-mixed-operators */
/* eslint-disable operator-assignment */

import { 
  sign,abs,PI,l,debounce
} from './common/index.js'

import {Stage,Text,Ring,Line} from './render/index.js'

const processData = ({ data, min }) => {
  const make = data.map((arr) => {
    const sumVal = arr.reduce(
      (previousValue, currentValue) => previousValue + currentValue.value,
      0,
    );
    return [...arr].map((item) => {
      const fac = Math.max(min, item.value / sumVal);
      return {
        ...item,
        rad: l(0, PI * 2, fac),
      };
    });
  });
  return make;
};

const createTooltip = ()=> {
  const $tooltip = document.createElement('div')
  $tooltip.style.cssText = `
    position:absolute;
    width:auto;
    height:auto;
    padding:8px 10px;
    display:none;
    pointer-events:none;
    background-color:white;
    color:#00000080;
    box-shadow:1px 1px 10px rgba(0,0,0,.2);
    border-radius:4px;
  `
  return $tooltip
}

export default function SunburstChart(config) {
  const that = {
    resizeObserver: null,
    onElementClick(fn) {
      this.handleElementClick = fn;
    },
    render() {
      if (this.stage) {
        this.stage.destroy();
        this.$tooltip.remove()
      }

      this.$tooltip = config.$el.appendChild(createTooltip())

      config.x = this.resizeObserver ? config.$el.offsetWidth * 0.5 : config.x;
      config.y = this.resizeObserver ? config.$el.offsetHeight * 0.5 : config.y;
      config.gap = config.gap ?? 0;
      config.min = config.min ?? 0.01;
      config.levels = config.levels ?? [];
      config.labelMode = config.labelMode ?? 'space-between';
      config.radius = this.resizeObserver ? config.$el.offsetHeight * 0.4 : config.radius;

      const processedData = processData({ data: config.data, min: config.min });

      const stage = Stage(
        config.$el.offsetWidth,
        config.$el.offsetHeight,
        config.$el,
      );

      this.stage = stage;

      const avgRadius = config.radius / processedData.length;

      for (let i = 0, len = processedData.length; i < len; i++) {
        const children = processedData[i];
        const radius = (i / len) * config.radius;

        const levelConfig =  config.levels?.[i]
        const font = Object.assign({tx:0,ty:0,font:'13px Regular',mode:'break-world'},levelConfig.font ??{})
        const co = levelConfig?.color;

        const depthChilds = [];
        for (let j = 0, len = children.length; j < len; j++) {
          const childData = children[j];

          const radian = childData.rad;

          let startRadian;
          let endRadian;

          if (j === 0) {
            startRadian = 0;
            endRadian = startRadian + radian;
          } else {
            startRadian = depthChilds[j - 1].endRadian;
            endRadian = startRadian + radian;
          }

          const ring = Ring({
            innerRadius: radius,
            outerRadius: radius + avgRadius,
            startRadian,
            endRadian,
          });
          ring.x = config.x;
          ring.y = config.y;
          ring.fillStyle = co;
          ring.strokeStyle = 'white';
          ring.lineWidth = config.gap;
          ring.globalAlpha = 1;
          ring.userParams = { ...childData,color:co };

          if (i !== processedData.length-1) {
            const textName = Text({ text: childData.name });
            const { x, y } = ring.getCenterPo();
            ring.add(textName);
            textName.x = x + font.tx
            textName.y = y + font.ty
            textName.font = font.font
            const textValue = Text({ text: childData.value });
            ring.add(textValue);
            textValue.font = font.font
            textValue.x = x + font.tx
            textValue.y = y + 18+ font.ty


            textName.shadowBlur = textValue.shadowBlur = font.shadowBlur
            textName.shadowOffsetX = textValue.shadowOffsetX = font.shadowOffsetX
            textName.shadowOffsetY = textValue.shadowOffsetY = font.shadowOffsetY
            textName.shadowColor = textValue.shadowColor = font.shadowColor
          }

          if (i === processedData.length-1) {
            const { x: x1, y: y1, normalize } = ring.getMiddleOfEdge();

            const line = Line({
              x1,
              y1,
              x2: x1 + normalize.x * 10,
              y2: y1 + normalize.y * 10,
            });
            ring.add(line);
            line.strokeStyle = '#6D7278';

            const dir = sign(normalize.x);
            const targetX =
              dir > 0
                ? ring.x + ring.outerRadius * 1.1
                : ring.x - ring.outerRadius * 1.1;
            const diffX = abs(targetX - line.x2) * dir;
            const line2 = Line({
              x1: line.x2,
              y1: line.y2,
              x2: line.x2 + diffX,
              y2: line.y2,
            });
            ring.add(line2);
            line2.strokeStyle = '#6D7278';

            if(font.mode === 'break-world'){
              const labelName = Text({
                text: childData.name,
              });
              const labelNameWidth = labelName.getWidth()
              labelName.font = font.font
              labelName.fillStyle = '#6D7278';
              labelName.x = line2.x2 + dir*(labelNameWidth+font.tx)
              labelName.y = line2.y2 + font.ty
              ring.add(labelName);

              const labelValue = Text({
                text: childData.value,
              });
              labelValue.font = font.font;
              labelValue.fillStyle = '#6D7278';
              labelValue.x = line2.x2 + dir * (labelNameWidth*.8 + font.tx)
              labelValue.y = line2.y2 + 14 + font.ty
              ring.add(labelValue);

              labelName.shadowBlur = labelValue.shadowBlur = font.shadowBlur
              labelName.shadowOffsetX = labelValue.shadowOffsetX = font.shadowOffsetX
              labelName.shadowOffsetY = labelValue.shadowOffsetY = font.shadowOffsetY
              labelName.shadowColor = labelValue.shadowColor = font.shadowColor

            }else{
              const labelName = Text({
                text: childData.name + ` (${childData.value}) `,
              });
              const labelNameWidth = labelName.getWidth()
              labelName.font = font.font
              labelName.fillStyle = '#6D7278';
              labelName.x = line2.x2 + dir*(labelNameWidth*.8+font.tx)
              labelName.y = line2.y2 + font.ty
              ring.add(labelName);

              labelName.shadowBlur =  font.shadowBlur
              labelName.shadowOffsetX =  font.shadowOffsetX
              labelName.shadowOffsetY =  font.shadowOffsetY
              labelName.shadowColor = font.shadowColor
            }



           

          }

          depthChilds.push(ring);

          stage.add(ring);
        }
      }

      stage.getShapes().forEach((item,i) => {
        item.onClick(() => {
          that.handleElementClick(item.userParams);
        });

        item.onMouseover((x,y) => {
          if(config.tooltip){
            const tooltipVal = config.tooltip(item.userParams,i)
            this.$tooltip.innerHTML = tooltipVal
            this.$tooltip.style.left = (x + 12) + 'px'
            this.$tooltip.style.top = (y + 12) + 'px'
            this.$tooltip.style.display = 'block'
          }

          stage.getShapes().forEach((n) => {
            n.globalAlpha = n === item ? 1 : 0.3;
          });
        });

        item.onMouseout(() => {
          this.$tooltip.style.display = 'none'
          stage.getShapes().forEach((n) => {
            n.globalAlpha = 1;
          });
        });
      });
      stage.onMouseout(() => {
        this.$tooltip.style.display = 'none'
        stage.getShapes().forEach((n) => {
          n.globalAlpha = 1;
        });
      });
      stage.tick(() => {
        stage.update();
      });
    },
    autoResize() {
      this.resizeObserver = new ResizeObserver(debounce(() => {
        that.render();
      }));
      this.resizeObserver.observe(config.$el);
    },
  };
  that.render();
  return that;
}
