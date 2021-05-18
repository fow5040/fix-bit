const colorSet = [
  {color: "magenta"},
  {color: "red"},
  {color: "orangered"},
  {color: "lime"},
  {color: "green"},
  {color: "aqua"},
  {color: "blue"},
  {color: "indigo"},
  {color: "purple"},
  {color: "plum"},
  {color: "lightseagreen"},
  {color: "white"},
  {color: "oldlace"},
  {color: "whitesmoke"}
];

function settingsComponent(props) {
  return (
    <Page>
      <Section
        title={
          <Text bold align="center">
            FixBit Settings
          </Text>
        }>
        <Toggle
          settingsKey="hour.fixed"
          label="Make hour numbers stationary?"
          />
       <Text align="center">
          Indicator Color
        </Text>
        <ColorSelect
          settingsKey="indicator.color"
          label="yolo"
          colors={colorSet} /> 
        <Toggle
          settingsKey="indicator.seconds"
          label="Show seconds indicator?"
          />
        <Toggle
          settingsKey="indicator.stats"
          label="Always show stats?"
          />
        

      </Section>
      
    </Page>
  );
}

registerSettingsPage(settingsComponent);
