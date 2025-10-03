
import MCQGenerator from './MCQGenerator'; // Imports the component from the other file
import './style.css'; // Imports the stylesheet

function App() {
  return (
    // The className "App" is a common convention but is not strictly necessary here
    // as the main container class is inside MCQGenerator.js
    <div className="App">
      <MCQGenerator />
    </div>
  );
}

export default App;
